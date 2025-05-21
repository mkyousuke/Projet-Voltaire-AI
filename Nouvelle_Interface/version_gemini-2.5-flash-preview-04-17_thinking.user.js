// ==UserScript==
// @name         Projet Voltaire Nouvelle Interface Assistant (Gemini 2.5 Flash)
// @namespace    http://tampermonkey.net/
// @version      0.0.1 Experimental // Prise en charge de la nouvelle interface du site
// @description  Assiste aux exercices de type phrase unique sur Projet Voltaire avec Gemini.
// @author       mkyousuke & Gemini Pro
// @match        https://compte.groupe-voltaire.fr/*
// @match        https://apprentissage.appli3.projet-voltaire.fr/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      generativelanguage.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    const GEMINI_API_KEY = 'VOTRE_CLE_API_GEMINI_ICI';
    const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    const MAX_MEMOIRES_CORRECTIONS = 5;

    let memoireDesCorrections = [];
    let globalIndicationBox = null;
    let analyzeButton = null;
    let uiUpdateTimeout = null;
    let initialDetectionInterval = null;
    let initialDetectionAttempts = 0;
    const MAX_INITIAL_DETECTION_ATTEMPTS = 15;

    function escapeHTML(str) {
        if (str === null || str === undefined) return "";
        return str.replace(/[&<>"']/g, function (match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    function ensureGlobalIndicationBox() {
        if (!globalIndicationBox) {
            globalIndicationBox = document.createElement('div');
            globalIndicationBox.id = 'pv-gemini-global-indication';
            Object.assign(globalIndicationBox.style, {
                position: 'fixed', bottom: '20px', left: '20px',
                zIndex: '10005',
                padding: '10px 15px', backgroundColor: '#e9f5fe', border: '1px solid #1a73e8',
                borderRadius: '5px', fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
                fontSize: '14px', boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                maxWidth: '350px', minWidth: '250px', display: 'none', textAlign: 'left',
                wordWrap: 'break-word'
            });
            document.body.appendChild(globalIndicationBox);
        }
    }

    function showGlobalIndication(message, type = 'info', isHtmlMessage = false) {
        ensureGlobalIndicationBox();

        let textColor = '#174ea6';
        let bgColor = '#e9f5fe';
        let borderColor = '#1a73e8';
        let boldColor = '#000000';

        switch (type) {
            case 'error':
                bgColor = '#fdecea'; borderColor = '#ea4335'; textColor = '#c5221f'; boldColor = '#8c1813';
                break;
            case 'success':
                bgColor = '#e6f4ea'; borderColor = '#34a853'; textColor = '#1e8e3e'; boldColor = '#155d27';
                break;
            case 'loading':
                bgColor = '#fefcdd'; borderColor = '#fbbc04'; textColor = '#3c4043'; boldColor = '#000000';
                break;
            case 'warning':
                bgColor = '#fff3cd'; borderColor = '#ffeeba'; textColor = '#856404'; boldColor = '#533f03';
                break;
            default:
                 boldColor = '#0d3c73';
                 break;
        }
        Object.assign(globalIndicationBox.style, {
            backgroundColor: bgColor,
            borderColor: borderColor,
            color: textColor
        });

        if (isHtmlMessage) {
            message = message.replace(/<b>(.*?)<\/b>/gi, `<b style="color: ${boldColor};">$1</b>`);
            globalIndicationBox.innerHTML = message;
        } else {
            globalIndicationBox.textContent = message;
        }
        globalIndicationBox.style.display = 'block';
    }

    function hideGlobalIndication() {
        if (globalIndicationBox) globalIndicationBox.style.display = 'none';
    }

    function removeAllStyling() {
        document.querySelectorAll('div[tabindex="0"], button[data-testid="button"]').forEach(el => {
            Object.assign(el.style, { outline: '', borderWidth: '', boxShadow: '', backgroundColor: '', margin: '' });
        });
    }

    async function callGeminiAPI(promptText, temperature = 0.1, maxOutputTokens = 150, customThinkingBudget = 0, systemInstructionText = null) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('VOTRE_CLE') || GEMINI_API_KEY === 'AIzaSyANoYtRjHoqRmo1oxpiH3mltMVjlFLftgg') {
            showGlobalIndication("ERREUR : Clé API Gemini non configurée. Veuillez la remplacer.", "error");
            return Promise.reject("Clé API non configurée");
        }
        let finalSystemInstruction = systemInstructionText || "";
        if (memoireDesCorrections.length > 0) {
            let learnedContext = "\n\nIMPORTANT : Prends en compte ces corrections et règles observées précédemment pour améliorer la précision de ta réponse actuelle :\n";
            memoireDesCorrections.forEach((lecon, index) => {
                learnedContext += `Leçon ${index + 1}: Règle: "${lecon.ruleTitle}" (Explication: ${lecon.ruleExplanation}).`;
                if (lecon.type === "phrase_unique_correction") {
                    learnedContext += ` Phrase correcte exemple: "${lecon.correctedSentence}". Phrase originale: "${lecon.originalSentence}".\n`;
                } else if (lecon.type === "pas_de_faute_confirmation_regle") {
                    learnedContext += ` Cette règle a été confirmée comme s'appliquant à une phrase sans faute (Exemple de phrase concernée: "${lecon.correctedSentence}").\n`;
                }
            });
            finalSystemInstruction = (finalSystemInstruction ? finalSystemInstruction + "\n" : "") + learnedContext;
        }
        const requestBody = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: temperature, maxOutputTokens: maxOutputTokens, topK: 1, topP: 0.1,
                ...(customThinkingBudget > 0 && GEMINI_MODEL_NAME.includes("2.5") && { thinkingConfig: { thinkingBudget: customThinkingBudget } })
            },
            ...(finalSystemInstruction && { systemInstruction: { parts: [{ text: finalSystemInstruction }] } })
        };
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST', url: GEMINI_API_URL, headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(requestBody), timeout: 60000,
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const jsonResponse = JSON.parse(response.responseText);
                            const candidate = jsonResponse.candidates?.[0];
                            if (candidate?.finishReason && !["STOP", "MAX_TOKENS", "OTHER"].includes(candidate.finishReason)) {
                                let errorMsg = `Génération arrêtée: ${candidate.finishReason}.`;
                                if (jsonResponse.promptFeedback?.blockReason) errorMsg += ` Raison blocage: ${jsonResponse.promptFeedback.blockReason}.`;
                                return reject(errorMsg);
                            }
                            if (typeof candidate?.content?.parts?.[0]?.text === 'string') return resolve(candidate.content.parts[0].text.trim());
                            if (jsonResponse.promptFeedback?.blockReason) return reject(`Réponse Gemini bloquée: ${jsonResponse.promptFeedback.blockReason}`);
                            reject("Format de réponse Gemini inattendu.");
                        } catch (e) { reject("Erreur de parsing de la réponse Gemini."); }
                    } else {
                        let errorMsg = `Erreur API Gemini (${GEMINI_MODEL_NAME}): ${response.status}`;
                        try { const errorResponse = JSON.parse(response.responseText); errorMsg += ` - ${errorResponse.error?.message || response.statusText}`; }
                        catch (e) { errorMsg += ` - ${response.statusText}.`; }
                        reject(errorMsg);
                    }
                },
                onerror: (error) => reject(`Erreur de connexion à l'API Gemini (${GEMINI_MODEL_NAME}).`),
                ontimeout: () => reject(`Timeout de la requête vers l'API Gemini (${GEMINI_MODEL_NAME}).`)
            });
        });
    }

    function findPreciseInstructionElement() {
        const candidates = Array.from(document.querySelectorAll('div[dir="auto"]'));
        let bestCandidate = null;
        for (const el of candidates) {
            if (el.textContent.trim().startsWith("Cliquez sur la faute") && el.offsetHeight > 0 && el.offsetWidth > 0) {
                if (!bestCandidate || el.innerHTML.length < bestCandidate.innerHTML.length) {
                     const noMistakeBtnInside = el.querySelector('button[data-testid="button"] div[data-testid="button-text"]');
                     if (!noMistakeBtnInside || !noMistakeBtnInside.textContent.trim().includes("Il n'y a pas de faute")) {
                        bestCandidate = el;
                     }
                }
            }
        }
        return bestCandidate;
    }

    async function processSingleSentenceCorrection() {
        console.log("[PV Gemini Assistant] PROCESS: Déclenchement processSingleSentenceCorrection.");
        const instructionElement = findPreciseInstructionElement();
        if (!instructionElement) {
            console.error("[PV Gemini Assistant] PROCESS ERR: Instruction 'Cliquez sur la faute' NON TROUVÉE (ERR_PSSC_INST_V18).");
            showGlobalIndication("Erreur interne: Elément instruction non trouvé (ERR_PSSC_INST_V18).", "error");
            return;
        }
        let noMistakeButton = null;
        const potentialButtons = Array.from(document.querySelectorAll('button[data-testid="button"]'));
        for (const btn of potentialButtons) {
            const textDiv = btn.querySelector('div[data-testid="button-text"]');
            if (textDiv && textDiv.textContent.trim() === "Il n'y a pas de faute") {
                noMistakeButton = btn;
                break;
            }
        }
        if (!noMistakeButton) {
            console.error("[PV Gemini Assistant] PROCESS ERR: Bouton 'Il n'y a pas de faute' NON TROUVÉ (ERR_PSSC_NOBTN_V18).");
            showGlobalIndication("Erreur interne: Bouton 'pas de faute' non trouvé (ERR_PSSC_NOBTN_V18).", "error");
            return;
        }
        const responseDisplay = document.querySelector('div[data-testid="exercise-response"]');
        if (responseDisplay && responseDisplay.offsetHeight > 0) {
            console.log("[PV Gemini Assistant] PROCESS LOG: Annulé, une réponse semble déjà affichée et visible.");
            return;
        }

        let sentenceHost = null;
        try {
            let current = instructionElement;
            let instructionAndSentenceBlock = null;
            for(let i=0; i<5 && current.parentElement; i++) {
                current = current.parentElement;
                if (current.children.length >= 2 &&
                    current.children[0].contains(instructionElement) &&
                    current.children[1]?.querySelector('div[tabindex="0"] > div > div[dir="auto"]')
                   ) {
                    instructionAndSentenceBlock = current;
                    break;
                }
            }
            if (instructionAndSentenceBlock && instructionAndSentenceBlock.children.length > 1) {
                sentenceHost = instructionAndSentenceBlock.children[1];
                if (!sentenceHost || !sentenceHost.querySelector('div[tabindex="0"] > div > div[dir="auto"]')) {
                    sentenceHost = null;
                }
            }
        } catch (e) { console.error("[PV Gemini Assistant] PROCESS ERR: Erreur en cherchant sentenceHost (structure):", e); }

        if (!sentenceHost) {
            console.warn("[PV Gemini Assistant] PROCESS WARN: Recherche structurelle de sentenceHost a échoué. Tentative globale.");
            const allDivs = Array.from(document.querySelectorAll('div'));
            for (let potentialHost of allDivs) {
                if (potentialHost.contains(instructionElement) || potentialHost.contains(noMistakeButton) || (responseDisplay && potentialHost.contains(responseDisplay)) || potentialHost.offsetHeight === 0) {
                    continue;
                }
                const wordsInside = potentialHost.querySelectorAll('div[tabindex="0"]');
                if (wordsInside.length > 2 && wordsInside.length < 40) {
                    let allWordsHaveCorrectStructure = true;
                    for (const word of wordsInside) {
                        if (!word.querySelector('div > div[dir="auto"]')) {
                            allWordsHaveCorrectStructure = false; break;
                        }
                    }
                    if (allWordsHaveCorrectStructure) { sentenceHost = potentialHost; break; }
                }
            }
        }

        if (!sentenceHost) {
            console.error("[PV Gemini Assistant] PROCESS ERR: Conteneur de phrase (sentenceHost) DÉFINITIVEMENT non trouvé (ERR_PSSC_NOHOST_V18).");
            showGlobalIndication("Erreur interne: Conteneur de phrase non trouvé (ERR_PSSC_NOHOST_V18).", "error");
            return;
        }
        console.log("[PV Gemini Assistant] PROCESS LOG: sentenceHost trouvé:", sentenceHost);

        const wordsClickableDivs = Array.from(sentenceHost.querySelectorAll('div[tabindex="0"]'));
        const sentenceParts = wordsClickableDivs.map(wordDiv => {
            const textElement = wordDiv.querySelector('div[dir="auto"]');
            return textElement ? textElement.textContent : '';
        });

        if (sentenceParts.some(part => part === null || part === undefined) || sentenceParts.length === 0) {
             console.error("[PV Gemini Assistant] PROCESS ERR: Texte de la phrase incomplet ou vide.", sentenceParts);
             showGlobalIndication("Erreur interne: Impossible d'extraire la phrase (ERR_PSSC_NOPARTS_V18).", "error");
             return;
        }
        const sentenceText = sentenceParts.join('').replace(/\s+/g, ' ').trim();
        if (!sentenceText) {
            console.error("[PV Gemini Assistant] PROCESS ERR: Texte de la phrase vide.");
            showGlobalIndication("Erreur interne: Phrase vide (ERR_PSSC_EMPTYTEXT_V18).", "error");
            return;
        }
        console.log(`[PV Gemini Assistant] PROCESS LOG: Phrase unique pour analyse : "${sentenceText}"`);
        showGlobalIndication(`Analyse (Phrase unique) en cours...`, "loading");

        const systemInstructionForSingle = `Tu es un correcteur grammatical, orthographique, et syntaxique expert de la langue française.`;
        const prompt = `Analyse la phrase suivante pour identifier une unique faute (la plus évidente ou la première rencontrée s'il y en a plusieurs). Types de fautes : orthographe, grammaire, conjugaison, accord, typographie, syntaxe. Phrase : "${sentenceText}" Instructions : 1. Si faute, réponds avec le mot/groupe de mots fautif exact. 2. Si correcte, réponds "AUCUNE_FAUTE". Ne fournis aucune explication. Exemples : "Les chat sont joueurs." -> "chat"; "Tout est en ordre." -> "AUCUNE_FAUTE".`;
        try {
            const singleSentenceThinkingBudget = 256;
            const estimatedResponseTokens = 30;
            const singleSentenceMaxOutputTokens = singleSentenceThinkingBudget + estimatedResponseTokens + 100;
            const geminiResponse = await callGeminiAPI(prompt, 0.1, singleSentenceMaxOutputTokens, singleSentenceThinkingBudget, systemInstructionForSingle);

            if (!geminiResponse && geminiResponse !== "") {
                showGlobalIndication("Aucune réponse de Gemini. Vérifiez console ou clé API.", "error"); return;
            }

            const normalizedResponseCheck = geminiResponse.toUpperCase().replace(/[\s.'?!,;-]/g, '');
            if (normalizedResponseCheck === "AUCUNEFAUTE") {
                showGlobalIndication(`${GEMINI_MODEL_NAME} suggère : Aucune faute. <br>👉 Cliquez sur '${escapeHTML(noMistakeButton.textContent.trim())}'.`, "success", true);
                if (noMistakeButton) Object.assign(noMistakeButton.style, { outline: '3px solid green', borderWidth: '3px', boxShadow: '0 0 10px green', backgroundColor: '#d4edda' });
            } else {
                const cleanGeminiResponse = geminiResponse.replace(/[.,;:!?]$/, '').trim();
                let textToDisplayInIndication = escapeHTML(cleanGeminiResponse);

                const wordsForMatching = wordsClickableDivs.map(div => ({
                    element: div,
                    text: (div.querySelector('div[dir="auto"]')?.textContent || "").trim()
                })).filter(item => item.text !== "");

                let foundElement = null;

                let exactMatch = wordsForMatching.find(item => item.text === cleanGeminiResponse);
                if (exactMatch) {
                    foundElement = exactMatch.element;
                    textToDisplayInIndication = escapeHTML(exactMatch.text);
                }

                if (!foundElement) {
                    const lowerCleanResponseForExactSearch = cleanGeminiResponse.toLowerCase();
                    exactMatch = wordsForMatching.find(item => item.text.toLowerCase() === lowerCleanResponseForExactSearch);
                    if (exactMatch) {
                        foundElement = exactMatch.element;
                        textToDisplayInIndication = escapeHTML(exactMatch.text);
                    }
                }

                if (!foundElement) {
                    const lowerCleanResponse = cleanGeminiResponse.toLowerCase();
                    let candidates = [];
                    wordsForMatching.forEach((item, i) => {
                        const elTextTrimmed = item.text;
                        const lowerElText = elTextTrimmed.toLowerCase();
                        let score = 0;
                        if (lowerElText.includes(lowerCleanResponse)) score = 90 - (lowerElText.length - lowerCleanResponse.length);
                        else if (lowerCleanResponse.includes(lowerElText)) {
                            if (lowerElText.length > 2) score = 70 + lowerElText.length;
                            else if (lowerElText.length > 0 && lowerCleanResponse.split(/\s+/).length === 1 && lowerCleanResponse.length <=3) score = 75;
                        } else if (Math.abs(lowerElText.length - lowerCleanResponse.length) < 3) {
                            let commonChars = 0;
                            for(let char of lowerCleanResponse) if(lowerElText.includes(char)) commonChars++;
                            if (commonChars / Math.max(lowerElText.length, lowerCleanResponse.length) > 0.7) score = 60 + commonChars;
                        }
                        if (score > 0) candidates.push({ element: item.element, score, index: i, text: elTextTrimmed });
                    });

                    if (candidates.length === 0 && cleanGeminiResponse.includes(' ')) {
                        const responseWords = lowerCleanResponse.split(/\s+/).filter(w => w.length > 1);
                        wordsForMatching.forEach((item, i) => {
                             const spanTextLower = item.text.toLowerCase();
                             if (responseWords.some(rw => spanTextLower.includes(rw) || rw.includes(spanTextLower))) {
                                candidates.push({element: item.element, score: 40 + spanTextLower.length, index: i, text: item.text});
                             }
                        });
                    }

                    if (candidates.length > 0) {
                        candidates.sort((a, b) => b.score - a.score || a.index - b.index);
                        foundElement = candidates[0].element;
                        textToDisplayInIndication = escapeHTML(candidates[0].text);
                        console.log(`[PV Gemini Assistant] PROCESS: Meilleure correspondance (score ${candidates[0].score}): "${escapeHTML(candidates[0].text)}" pour réponse Gemini originale "${escapeHTML(geminiResponse)}"`);
                    }
                }

                if (foundElement) {
                    showGlobalIndication(`${GEMINI_MODEL_NAME} suggère faute sur : <b>${textToDisplayInIndication}</b>. <br>👉 Cliquez sur le mot surligné.`, "info", true);
                    Object.assign(foundElement.style, {
                        backgroundColor: '#f8d7da',
                        outline: '2px solid red',
                        boxShadow: '0 0 6px rgba(255, 0, 0, 0.6)',
                        borderRadius: '3px',
                    });
                } else {
                    showGlobalIndication(`${GEMINI_MODEL_NAME} a indiqué : <b>${textToDisplayInIndication}</b>, non trouvé. Vérifiez ou "aucune faute".`, "warning", true);
                }
            }
        } catch (error) {
            showGlobalIndication(`Erreur analyse (Phrase unique) : ${error.message || error}`, "error");
            console.error("[PV Gemini Assistant] PROCESS ERR: Erreur processSingleSentenceCorrection:", error);
        }
    }

    function extraireTexteNetAvecStructure(node) {
        if (!node) return "";
        let text = "";
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                text += child.textContent;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                if (child.tagName === 'BR') text += '\n';
                else text += extraireTexteNetAvecStructure(child);
            }
        });
        return text.replace(/\s+/g, ' ').trim();
    }

    function apprendreDesCorrections() {
        const responseContainer = document.querySelector('div[data-testid="exercise-response"]');
        if (!responseContainer || responseContainer.offsetParent === null) return;

        const responseErrorHeader = responseContainer.querySelector('div[data-testid="response-error-header"]');
        const responseSuccessHeader = responseContainer.querySelector('div[data-testid="response-success-header"]');
        const ruleTitleNode = document.querySelector('div[data-testid="rule-title"]');
        const ruleExplanationNode = document.querySelector('div[data-testid="rule-explanation"]');

        let typeDeLecon = null;
        if (responseErrorHeader) {
            typeDeLecon = "phrase_unique_correction";
        } else if (responseSuccessHeader && responseSuccessHeader.textContent.includes("Bravo, il n'y a pas de faute")) {
            typeDeLecon = "pas_de_faute_confirmation_regle";
        }

        if (typeDeLecon && (ruleTitleNode || ruleExplanationNode)) {
            let phrasePourLecon = "N/A";
            let phraseOriginale = "N/A";

            let originalSentenceNode = responseContainer.querySelector('div[data-testid="exercise-sentence-text"]');

            if (originalSentenceNode) {
                 phraseOriginale = extraireTexteNetAvecStructure(originalSentenceNode);
            }

            if (typeDeLecon === "phrase_unique_correction") {
                let solutionNode = responseContainer.querySelector('div[data-testid="exercise-solution-text"]');
                if (solutionNode) {
                    phrasePourLecon = extraireTexteNetAvecStructure(solutionNode);
                } else {
                    phrasePourLecon = "Phrase corrigée non trouvée.";
                }
            } else if (typeDeLecon === "pas_de_faute_confirmation_regle") {
                phrasePourLecon = phraseOriginale;
            }

            const titreRegle = ruleTitleNode ? extraireTexteNetAvecStructure(ruleTitleNode) : "";
            const explicationRegle = ruleExplanationNode ? extraireTexteNetAvecStructure(ruleExplanationNode) : "";

            if (titreRegle || explicationRegle) {
                const nouvelleLecon = {
                    type: typeDeLecon,
                    ruleTitle: titreRegle || (typeDeLecon === "phrase_unique_correction" ? "Règle non titrée (correction)" : "Règle non titrée (pas de faute)"),
                    ruleExplanation: explicationRegle,
                    correctedSentence: phrasePourLecon,
                    originalSentence: (typeDeLecon === "phrase_unique_correction" && phraseOriginale !== "N/A") ? phraseOriginale : undefined,
                    timestamp: Date.now()
                };

                const estDoublon = memoireDesCorrections.some(lecon =>
                    lecon.ruleTitle === nouvelleLecon.ruleTitle &&
                    lecon.ruleExplanation === nouvelleLecon.ruleExplanation &&
                    (lecon.type !== "phrase_unique_correction" || lecon.originalSentence === nouvelleLecon.originalSentence) &&
                    (lecon.type !== "pas_de_faute_confirmation_regle" || lecon.correctedSentence === nouvelleLecon.correctedSentence)
                );

                if (!estDoublon) {
                    memoireDesCorrections.push(nouvelleLecon);
                    if (memoireDesCorrections.length > MAX_MEMOIRES_CORRECTIONS) {
                        memoireDesCorrections.sort((a, b) => a.timestamp - b.timestamp).shift();
                    }
                    console.log("[PV Gemini Assistant] Leçon apprise : ", nouvelleLecon);
                    showGlobalIndication("Nouvelle règle/correction mémorisée.", "success");
                    setTimeout(hideGlobalIndication, 3000);
                }
            }
        }
    }

    function updateUIForCurrentPage(isInitialCall = false) {
        if (isInitialCall) console.log(`[PV Gemini Assistant] updateUI (Tentative initiale ${initialDetectionAttempts + 1}/${MAX_INITIAL_DETECTION_ATTEMPTS})...`);
        else console.log("[PV Gemini Assistant] updateUI (Mutation)...");

        const instructionElement = findPreciseInstructionElement();
        let noMistakeButton = null;
        const potentialButtons = Array.from(document.querySelectorAll('button[data-testid="button"]'));
        for (const btn of potentialButtons) {
            const textDiv = btn.querySelector('div[data-testid="button-text"]');
            if (textDiv && textDiv.textContent.trim() === "Il n'y a pas de faute") {
                noMistakeButton = btn;
                break;
            }
        }
        const answerContainer = document.querySelector('div[data-testid="exercise-response"]');

        apprendreDesCorrections();

        const isSingleSentenceExerciseActive = instructionElement && noMistakeButton && (!answerContainer || answerContainer.offsetParent === null);

        if(isInitialCall || (analyzeButton && !document.body.contains(analyzeButton)) ) {
            console.log(`[PV Gemini Assistant] DEBUG updateUI: instructionElement: ${instructionElement ? 'Trouvé' : 'Non trouvé'}, noMistakeButton: ${noMistakeButton ? 'Trouvé' : 'Non trouvé'}, answerContainer: ${answerContainer ? (answerContainer.offsetParent === null ? 'Non visible' : 'Visible') : 'Non trouvé'}, isExerciseActive: ${isSingleSentenceExerciseActive}`);
        }

        const isButtonCurrentlyDisplayed = analyzeButton && document.body.contains(analyzeButton);

        if (isSingleSentenceExerciseActive) {
            if (initialDetectionInterval) {
                clearInterval(initialDetectionInterval);
                initialDetectionInterval = null;
                console.log("[PV Gemini Assistant] Exercice détecté, arrêt des tentatives initiales par intervalle.");
            }
            if (!isButtonCurrentlyDisplayed) {
                console.log("[PV Gemini Assistant] Affichage du bouton d'analyse.");
                hideGlobalIndication();
                removeAllStyling();
                analyzeButton = document.createElement('button');
                analyzeButton.id = 'gemini-analyze-button-single';
                analyzeButton.textContent = 'Analyser Phrase (Gemini)';
                analyzeButton.onclick = processSingleSentenceCorrection;
                Object.assign(analyzeButton.style, {
                    position: 'fixed', top: '70px', right: '20px', zIndex: '10000',
                    padding: '10px 15px', backgroundColor: '#1a73e8', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
                });
                document.body.appendChild(analyzeButton);
                if (globalIndicationBox && globalIndicationBox.style.display === 'none') {
                     showGlobalIndication("Prêt à analyser la phrase.", "info");
                }
            }
        } else {
            if (isButtonCurrentlyDisplayed) {
                console.log("[PV Gemini Assistant] Exercice non actif ou réponse affichée, suppression du bouton.");
                analyzeButton.remove();
                analyzeButton = null;
                removeAllStyling();
            }

            if (isInitialCall) {
                initialDetectionAttempts++;
                if (initialDetectionAttempts >= MAX_INITIAL_DETECTION_ATTEMPTS && initialDetectionInterval) {
                    clearInterval(initialDetectionInterval);
                    initialDetectionInterval = null;
                    console.log("[PV Gemini Assistant] Nombre maximum de tentatives initiales atteint. Arrêt de la recherche active par intervalle.");
                }
            }
        }
    }

    const observer = new MutationObserver((mutationsList) => {
        if (initialDetectionInterval && initialDetectionAttempts < MAX_INITIAL_DETECTION_ATTEMPTS) return;

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let relevantChange = false;

                const checkNode = (node) => node.nodeType === 1 && (
                    node.querySelector('button[data-testid="button"]') ||
                    node.querySelector('div[tabindex="0"]') ||
                    (node.textContent && node.textContent.includes("Cliquez sur la faute")) ||
                    node.querySelector('div[data-testid="exercise-response"]') ||
                    node.matches('button[data-testid="button"], div[tabindex="0"], div[data-testid="exercise-response"]')
                );

                if (Array.from(mutation.addedNodes).some(checkNode) || Array.from(mutation.removedNodes).some(checkNode)) {
                    relevantChange = true;
                }

                if (relevantChange) {
                    clearTimeout(uiUpdateTimeout);
                    uiUpdateTimeout = setTimeout(() => {
                        updateUIForCurrentPage(false);
                    }, 750);
                    break;
                }
            }
        }
    });

    window.addEventListener('load', () => {
        console.log(`[PV Gemini Assistant] Page chargée. Init script v${GM_info.script.version} (${GEMINI_MODEL_NAME}).`);
        ensureGlobalIndicationBox();
        observer.observe(document.body, { childList: true, subtree: true });

        initialDetectionAttempts = 0;
        if (initialDetectionInterval) clearInterval(initialDetectionInterval);

        initialDetectionInterval = setInterval(() => {
            const isButtonDisplayed = analyzeButton && document.body.contains(analyzeButton);
            const instruction = findPreciseInstructionElement();
            let noMistakeBtnFound = false;
            const potBtns = Array.from(document.querySelectorAll('button[data-testid="button"]'));
            for (const btn of potBtns) {
                const txtDiv = btn.querySelector('div[data-testid="button-text"]');
                if (txtDiv && txtDiv.textContent.trim() === "Il n'y a pas de faute") { noMistakeBtnFound = true; break; }
            }
            const answerCont = document.querySelector('div[data-testid="exercise-response"]');
            const isExerciseTrulyActive = instruction && noMistakeBtnFound && (!answerCont || answerCont.offsetParent === null);

            if(isButtonDisplayed && isExerciseTrulyActive && initialDetectionInterval) {
                clearInterval(initialDetectionInterval);
                initialDetectionInterval = null;
                console.log("[PV Gemini Assistant] Interface utilisateur détectée et active. Arrêt de la détection initiale par intervalle.");
                return;
            }

            if(initialDetectionAttempts < MAX_INITIAL_DETECTION_ATTEMPTS) {
                 updateUIForCurrentPage(true);
            } else if (initialDetectionInterval) {
                clearInterval(initialDetectionInterval);
                initialDetectionInterval = null;
            }
        }, 750);

        setTimeout(() => {
            const isButtonDisplayed = analyzeButton && document.body.contains(analyzeButton);
            if (!isButtonDisplayed && initialDetectionAttempts < MAX_INITIAL_DETECTION_ATTEMPTS) {
                 updateUIForCurrentPage(true);
            }
        } , 2000);
    });

})();