// ==UserScript==
// @name         Projet Voltaire Assistant (Gemini 2.5 Flash)
// @namespace    http://tampermonkey.net/
// @version      0.8.3 // Refonte affichage indications (fixe bas-droite, persistant)
// @description  Assiste à plusieurs types d'exercices sur Projet Voltaire avec Gemini 2.5 Flash, en apprenant des corrections et des règles confirmées.
// @author       mkyousuke & Gemini Pro
// @match        https://www.projet-voltaire.fr/*
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
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    let globalIndicationBox = null;

    function ensureGlobalIndicationBox() {
        if (!globalIndicationBox) {
            globalIndicationBox = document.createElement('div');
            globalIndicationBox.id = 'pv-gemini-global-indication';
            globalIndicationBox.style.position = 'fixed';
            globalIndicationBox.style.bottom = '20px';
            globalIndicationBox.style.right = '20px';
            globalIndicationBox.style.zIndex = '10005';
            globalIndicationBox.style.padding = '10px 15px';
            globalIndicationBox.style.backgroundColor = '#e9f5fe';
            globalIndicationBox.style.border = '1px solid #1a73e8';
            globalIndicationBox.style.borderRadius = '5px';
            globalIndicationBox.style.fontFamily = '"Google Sans", Roboto, Arial, sans-serif';
            globalIndicationBox.style.fontSize = '14px';
            globalIndicationBox.style.boxShadow = '0px 2px 4px rgba(0,0,0,0.1)';
            globalIndicationBox.style.maxWidth = '350px';
            globalIndicationBox.style.minWidth = '250px';
            globalIndicationBox.style.display = 'none';
            globalIndicationBox.style.textAlign = 'left';
            document.body.appendChild(globalIndicationBox);
        }
    }

    function showGlobalIndication(message, type = 'info') {
        ensureGlobalIndicationBox();
        globalIndicationBox.innerHTML = message;
        globalIndicationBox.style.display = 'block';

        if (type === 'error') {
            globalIndicationBox.style.backgroundColor = '#fdecea';
            globalIndicationBox.style.borderColor = '#ea4335';
            globalIndicationBox.style.color = '#c5221f';
        } else if (type === 'success') {
            globalIndicationBox.style.backgroundColor = '#e6f4ea';
            globalIndicationBox.style.borderColor = '#34a853';
            globalIndicationBox.style.color = '#1e8e3e';
        } else if (type === 'loading') {
            globalIndicationBox.style.backgroundColor = '#fefcdd';
            globalIndicationBox.style.borderColor = '#fbbc04';
            globalIndicationBox.style.color = '#3c4043';
        } else { // info
            globalIndicationBox.style.backgroundColor = '#e9f5fe';
            globalIndicationBox.style.borderColor = '#1a73e8';
            globalIndicationBox.style.color = '#174ea6';
        }
    }

    function hideGlobalIndication() {
        if (globalIndicationBox) {
            globalIndicationBox.style.display = 'none';
        }
    }

    function removeAllStyling() {
        document.querySelectorAll('.pointAndClickSpan, .noMistakeButton, .intensiveQuestion button').forEach(el => {
            el.style.outline = '';
            el.style.borderWidth = '';
            el.style.boxShadow = '';
        });
    }

    async function callGeminiAPI(promptText, temperature = 0.1, maxOutputTokens = 100, customThinkingBudget = 0, systemInstructionText = null) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('VOTRE_CLE')) {
            showGlobalIndication("ERREUR : Clé API Gemini non configurée.", "error");
            return Promise.reject("Clé API non configurée");
        }
        
        let finalSystemInstruction = systemInstructionText || "";
        if (memoireDesCorrections.length > 0) {
            let learnedContext = "\n\nIMPORTANT : Prends en compte ces corrections et règles observées précédemment pour améliorer la précision de ta réponse actuelle :\n";
            memoireDesCorrections.forEach((lecon, index) => {
                learnedContext += `Leçon ${index + 1}: Règle: "${lecon.ruleTitle}" (Explication: ${lecon.ruleExplanation}).`;
                if (lecon.type === "phrase_unique_correction") {
                    learnedContext += ` Phrase correcte exemple: "${lecon.correctedSentence}".\n`;
                } else if (lecon.type === "pas_de_faute_confirmation_regle") {
                    learnedContext += ` Cette règle a été confirmée comme s'appliquant à une phrase sans faute (Exemple de phrase concernée: "${lecon.correctedSentence}").\n`;
                } else {
                    learnedContext += "\n";
                }
            });
            finalSystemInstruction = (finalSystemInstruction ? finalSystemInstruction + "\n" : "") + learnedContext;
        }

        console.log(`[PV Gemini Assistant] Instruction Système Combinée envoyée:`, finalSystemInstruction || "Aucune");
        console.log(`[PV Gemini Assistant] Prompt (contents) envoyé à ${GEMINI_MODEL_NAME}:`, promptText);
        console.log(`[PV Gemini Assistant] Paramètres: temp=${temperature}, maxTokens=${maxOutputTokens}, thinkingBudget=${customThinkingBudget}`);

        const requestBody = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxOutputTokens,
                topK: 1,
                topP: 0.1,
                thinkingConfig: {
                    thinkingBudget: customThinkingBudget
                }
            }
        };

        if (finalSystemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: finalSystemInstruction }]
            };
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: GEMINI_API_URL,
                headers: { 'Content-Type': 'application/json', },
                data: JSON.stringify(requestBody),
                timeout: 60000,
                onload: (response) => {
                    console.log(`[PV Gemini Assistant] Réponse API reçue. Statut: ${response.status}`);
                    if (response.status === 200) {
                        console.log("[PV Gemini Assistant] Réponse BRUTE de l'API (status 200):", response.responseText);
                        try {
                            const jsonResponse = JSON.parse(response.responseText);
                            console.log("[PV Gemini Assistant] Réponse JSON parsée (status 200):", jsonResponse);
                            if(jsonResponse.usageMetadata) {
                                console.log("[PV Gemini Assistant] Usage Metadata:", jsonResponse.usageMetadata);
                            }

                            if (jsonResponse.candidates && jsonResponse.candidates.length > 0 && jsonResponse.candidates[0].finishReason && jsonResponse.candidates[0].finishReason !== "STOP" && jsonResponse.candidates[0].finishReason !== "MAX_TOKENS" && jsonResponse.candidates[0].finishReason !== "OTHER") {
                                console.error(`[PV Gemini Assistant] Génération arrêtée. finishReason: ${jsonResponse.candidates[0].finishReason}. Réponse:`, jsonResponse);
                                if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
                                     reject(`Réponse Gemini bloquée: ${jsonResponse.promptFeedback.blockReason} (finishReason: ${jsonResponse.candidates[0].finishReason})`);
                                     return;
                                }
                                if (jsonResponse.candidates[0].finishReason === "SAFETY") {
                                    reject(`Réponse Gemini bloquée pour des raisons de sécurité (finishReason: SAFETY).`);
                                    return;
                                }
                                reject(`Génération de texte incomplète: ${jsonResponse.candidates[0].finishReason}`);
                                return;
                            }

                            if (jsonResponse.candidates &&
                                jsonResponse.candidates[0] &&
                                jsonResponse.candidates[0].content &&
                                jsonResponse.candidates[0].content.parts &&
                                jsonResponse.candidates[0].content.parts[0] &&
                                typeof jsonResponse.candidates[0].content.parts[0].text === 'string') {
                                resolve(jsonResponse.candidates[0].content.parts[0].text.trim());
                            } else if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
                                console.error("[PV Gemini Assistant] Réponse Gemini bloquée (promptFeedback). Feedback:", jsonResponse.promptFeedback);
                                reject(`Réponse Gemini bloquée: ${jsonResponse.promptFeedback.blockReason}`);
                            } else if (jsonResponse.candidates && jsonResponse.candidates[0] && jsonResponse.candidates[0].finishReason === "MAX_TOKENS" && (!jsonResponse.candidates[0].content || !jsonResponse.candidates[0].content.parts)) {
                                console.error("[PV Gemini Assistant] MAX_TOKENS atteint sans contenu 'parts' utilisable. Augmentez maxOutputTokens ou vérifiez le prompt/thinkingBudget.");
                                reject("MAX_TOKENS atteint sans contenu textuel. Essayez d'augmenter maxOutputTokens.");
                            } else {
                                console.error("[PV Gemini Assistant] Format de réponse Gemini INATTENDU (status 200). Réponse JSON actuelle:", jsonResponse);
                                reject("Format de réponse Gemini inattendu.");
                            }
                        } catch (e) {
                            console.error("[PV Gemini Assistant] Erreur de PARSING de la réponse Gemini (status 200). Erreur:", e);
                            console.error("[PV Gemini Assistant] Réponse brute qui a causé l'erreur de parsing:", response.responseText);
                            reject("Erreur de parsing de la réponse Gemini.");
                        }
                    } else {
                        console.error(`[PV Gemini Assistant] Erreur API Gemini (${GEMINI_MODEL_NAME}) - Statut HTTP: ${response.status}. Réponse brute:`, response.responseText);
                        try {
                            const errorResponse = JSON.parse(response.responseText);
                            reject(`Erreur API Gemini (${GEMINI_MODEL_NAME}): ${response.status} - ${errorResponse.error?.message || response.statusText}`);
                        } catch (e) {
                            reject(`Erreur API Gemini (${GEMINI_MODEL_NAME}): ${response.status} - ${response.statusText}. Impossible de parser la réponse d'erreur.`);
                        }
                    }
                },
                onerror: (error) => {
                    console.error(`[PV Gemini Assistant] Erreur de CONNEXION à l'API Gemini (${GEMINI_MODEL_NAME}). Détails:`, error);
                    reject(`Erreur de connexion à l'API Gemini (${GEMINI_MODEL_NAME}).`);
                },
                ontimeout: () => {
                    console.error(`[PV Gemini Assistant] TIMEOUT de la requête vers l'API Gemini (${GEMINI_MODEL_NAME}).`);
                    reject(`Timeout de la requête vers l'API Gemini (${GEMINI_MODEL_NAME}).`);
                }
            });
        });
    }

    async function processSingleSentenceCorrection() {
        const sentenceElement = document.querySelector('.pointAndClickView .sentence');
        const noMistakeButton = document.querySelector('.pointAndClickView .noMistakeButton');

        if (document.querySelector('.popupPanel.intensivePopup .intensiveQuestion')) {
            console.log("[PV Gemini Assistant] processSingleSentenceCorrection: Annulé, un QCM semble actif.");
            return;
        }

        if (!sentenceElement || !noMistakeButton) {
            console.log("[PV Gemini Assistant] Type 1: Conditions non remplies.");
            return;
        }
        const sentenceText = sentenceElement.textContent.trim();
        if (!sentenceText) return;

        console.log(`[PV Gemini Assistant] Type 1 (Phrase unique) détectée : "${sentenceText}"`);
        showGlobalIndication(`Analyse (Phrase unique) en cours avec ${GEMINI_MODEL_NAME}...`, "loading");
        
        const systemInstructionForSingle = `Tu es un correcteur grammatical, orthographique, et syntaxique expert de la langue française.`;
        const prompt = `Analyse la phrase suivante pour identifier une unique faute (la plus évidente ou la première rencontrée s'il y en a plusieurs). Types de fautes : orthographe, grammaire, conjugaison, accord, typographie, syntaxe. Phrase : "${sentenceText}" Instructions : 1. Si faute, réponds avec le mot/groupe de mots fautif exact. 2. Si correcte, réponds "AUCUNE_FAUTE". Ne fournis aucune explication. Exemples : "Les chat sont joueurs." -> "chat"; "Tout est en ordre." -> "AUCUNE_FAUTE".`;
        
        try {
            const singleSentenceThinkingBudget = 512;
            const estimatedResponseTokens = 30;
            const singleSentenceMaxOutputTokens = singleSentenceThinkingBudget + estimatedResponseTokens + 50;

            console.log(`[PV Gemini Assistant] Phrase Unique: thinkingBudget=${singleSentenceThinkingBudget}, calculatedMaxOutputTokens=${singleSentenceMaxOutputTokens}`);

            const geminiResponse = await callGeminiAPI(prompt, 0.1, singleSentenceMaxOutputTokens, singleSentenceThinkingBudget, systemInstructionForSingle);
            
            if (!geminiResponse && geminiResponse !== "") {
                showGlobalIndication("Aucune réponse de Gemini (Phrase unique) ou clé API non configurée.", "error");
                return;
            }
            const normalizedResponseCheck = geminiResponse.toUpperCase().replace(/[\s.]/g, '');
            if (normalizedResponseCheck === "AUCUNE_FAUTE") {
                showGlobalIndication(`${GEMINI_MODEL_NAME} suggère : Aucune faute. <br>👉 Cliquez sur 'IL N'Y A PAS DE FAUTE'.`, "success");
                if(noMistakeButton) { noMistakeButton.style.outline = '3px solid green'; noMistakeButton.style.borderWidth = '3px'; noMistakeButton.style.boxShadow = '0 0 10px green'; }
            } else {
                const wordsToClickElements = Array.from(document.querySelectorAll('.pointAndClickView .pointAndClickSpan'));
                let foundElement = null;
                const cleanGeminiResponse = geminiResponse.replace(/[.,;:!?]$/, '').trim();

                foundElement = wordsToClickElements.find(el => el.textContent.trim() === cleanGeminiResponse);

                if (!foundElement) {
                    foundElement = wordsToClickElements.find(el => el.textContent.trim().toLowerCase() === cleanGeminiResponse.toLowerCase());
                }

                if (!foundElement) {
                    const lowerCleanResponse = cleanGeminiResponse.toLowerCase();
                    let candidates = [];
                    for (let i = 0; i < wordsToClickElements.length; i++) {
                        const el = wordsToClickElements[i];
                        const elTextTrimmed = el.textContent.trim();
                        const lowerElText = elTextTrimmed.toLowerCase();
                        let score = 0;
                        if (lowerElText === "") continue;
                        if (lowerElText.includes(lowerCleanResponse)) {
                            score = 90 - (lowerElText.length - lowerCleanResponse.length);
                        } else if (lowerCleanResponse.includes(lowerElText)) {
                            if (lowerElText.length > 2) {
                                 score = 70 + lowerElText.length;
                            } else if (lowerElText.length > 0 && lowerCleanResponse.split(/\s+/).length ===1 && lowerCleanResponse.length <=3) {
                                 score = 75;
                            }
                        }
                        if (score > 0) {
                            candidates.push({ element: el, score: score, index: i, text: elTextTrimmed });
                        }
                    }
                    if (candidates.length === 0 && cleanGeminiResponse.includes(' ')) {
                        const responseWords = lowerCleanResponse.split(/\s+/).filter(w => w.length > 2);
                        for (let i = 0; i < wordsToClickElements.length; i++) {
                            const el = wordsToClickElements[i];
                            const spanTextLower = el.textContent.trim().toLowerCase();
                            if (responseWords.some(rw => spanTextLower.includes(rw))) {
                                candidates.push({element: el, score: 40, index: i, text: el.textContent.trim()});
                            }
                        }
                    }
                    if (candidates.length > 0) {
                        candidates.sort((a, b) => {
                            if (b.score !== a.score) { return b.score - a.score; }
                            return a.index - b.index;
                        });
                        foundElement = candidates[0].element;
                        console.log(`[PV Gemini Assistant] Meilleure correspondance trouvée (score ${candidates[0].score}, index ${candidates[0].index}): "${candidates[0].text}" pour la réponse Gemini "${cleanGeminiResponse}"`);
                    }
                }

                if (foundElement) {
                    showGlobalIndication(`${GEMINI_MODEL_NAME} suggère une faute sur/près de : "<b>${geminiResponse}</b>". <br>👉 Cliquez sur le mot/groupe surligné.`, "info");
                    foundElement.style.outline = '3px solid red'; foundElement.style.borderWidth = '3px';  foundElement.style.boxShadow = '0 0 10px red';
                } else {
                    showGlobalIndication(`${GEMINI_MODEL_NAME} a indiqué : "<b>${geminiResponse}</b>", mais non trouvé. Vérifiez ou considérez "aucune faute".`, "warning");
                }
            }
        } catch (error) {
            showGlobalIndication(`Erreur analyse (Phrase unique) : ${error}`, "error");
            console.error("[PV Gemini Assistant] Erreur processSingleSentenceCorrection:", error);
        }
    }

    async function processMultipleChoiceExercise() {
        console.log("[PV Gemini Assistant] processMultipleChoiceExercise DÉCLENCHÉ.");
        const qcmPopup = document.querySelector('.popupPanel.intensivePopup');
        if (!qcmPopup) {
            console.log("[PV Gemini Assistant] Type 2: Popup QCM non trouvé.");
            return;
        }

        const ruleTitleElement = qcmPopup.querySelector('.intensiveRule .rule-details-title');
        const ruleTitleText = ruleTitleElement ? ruleTitleElement.textContent.trim() : "";

        let fullRuleDescription = "";
        const ruleExplanationElement = qcmPopup.querySelector('.rule-details-description .explanation'); 
        
        if (ruleExplanationElement) {
            fullRuleDescription = ruleExplanationElement.textContent.trim();
            console.log("[PV Gemini Assistant] Texte descriptif QCM de la règle détecté :", fullRuleDescription);
        } else {
            console.warn("[PV Gemini Assistant] Texte descriptif QCM de la règle non trouvé (sélecteur utilisé: '.rule-details-description .explanation').");
        }

        let systemInstructionForRule;
        if (ruleTitleText || fullRuleDescription) {
            let ruleCombinedText = ruleTitleText;
            if (fullRuleDescription) {
                ruleCombinedText += (ruleTitleText ? ' - Description : ' : '') + fullRuleDescription;
            }
            systemInstructionForRule = `Tu es un correcteur grammatical expert. La règle FONDAMENTALE à appliquer pour les phrases suivantes est : "${ruleCombinedText}". Tu dois évaluer chaque phrase UNIQUEMENT en fonction de cette règle et des règles générales du français standard. Sois rigoureux et précis.`;
        } else {
            systemInstructionForRule = `Tu es un correcteur grammatical expert. Applique les règles générales du français standard pour évaluer les phrases suivantes. Sois rigoureux et précis.`;
            console.warn("[PV Gemini Assistant] QCM: Ni titre, ni description de règle trouvés. Utilisation d'une instruction système générique.");
        }

        const understoodButton = qcmPopup.querySelector('button.understoodButton');
        if (understoodButton && understoodButton.style.display !== 'none' && getComputedStyle(understoodButton).visibility !== 'hidden' && getComputedStyle(understoodButton).opacity !== '0') {
            console.log("[PV Gemini Assistant] Type 2: Clic sur le bouton 'J'ai compris'.");
            understoodButton.click();
            await wait(500);
        }

        const questionItems = qcmPopup.querySelectorAll('.intensiveQuestions .intensiveQuestion');
        if (questionItems.length === 0) {
            showGlobalIndication("Type 2: Aucun item de question à analyser trouvé.", "error");
            return;
        }
        console.log(`[PV Gemini Assistant] Type 2: ${questionItems.length} items trouvés. Règle (titre): "${ruleTitleText}"`);
        showGlobalIndication(`Analyse (QCM) en cours pour ${questionItems.length} phrases avec ${GEMINI_MODEL_NAME}...`, "loading");

        let phrasesTextArray = [];
        let phraseElementsData = [];

        questionItems.forEach((item, index) => {
            const phraseElement = item.querySelector('.sentence');
            const correctButton = item.querySelector('button.buttonOk');
            const incorrectButton = item.querySelector('button.buttonKo');
            const text = phraseElement ? phraseElement.textContent.trim() : null;

            if (text && correctButton && incorrectButton) {
                phrasesTextArray.push(`${index + 1}. ${text}`);
                phraseElementsData.push({ element: item, phrase: text, correctButton: correctButton, incorrectButton: incorrectButton, originalIndex: index });
            } else {
                console.warn(`[PV Gemini Assistant] Type 2: Item ${index + 1}: Phrase ou boutons non trouvés dans:`, item);
            }
        });

        if (phrasesTextArray.length === 0) {
            showGlobalIndication("Type 2: Aucune phrase à analyser extraite des items QCM.", "error");
            return;
        }

        const userPromptForQCM = `En te basant sur la règle fondamentale fournie précédemment dans l'instruction système, évalue les phrases suivantes.
Phrases :
${phrasesTextArray.join("\n")}
Instructions : Réponds avec un tableau JSON. Chaque objet : {"numero": (entier de 1 à ${phrasesTextArray.length}), "evaluation": ("CORRECTE" ou "INCORRECTE")}. Seulement le tableau JSON. Exemple : [{"numero": 1, "evaluation": "CORRECTE"}, {"numero": 2, "evaluation": "INCORRECTE"}]`;

        try {
            const qcmThinkingBudget = 1024;
            const estimatedResponseTokens = 20 * phrasesTextArray.length;
            const qcmMaxOutputTokens = qcmThinkingBudget + estimatedResponseTokens + 150;
            console.log(`[PV Gemini Assistant] QCM: thinkingBudget=${qcmThinkingBudget}, calculatedMaxOutputTokens=${qcmMaxOutputTokens}`);
            const geminiResponse = await callGeminiAPI(userPromptForQCM, 0.2, qcmMaxOutputTokens, qcmThinkingBudget, systemInstructionForRule);
            
            if (!geminiResponse && geminiResponse !== "") {
                showGlobalIndication("Aucune réponse de Gemini (QCM) ou clé API non configurée.", "error");
                return;
            }
            let evaluations;
            try {
                const cleanedResponse = geminiResponse.replace(/```json\s*|\s*```/g, '').trim();
                evaluations = JSON.parse(cleanedResponse);
            } catch (e) { console.error("[PV Gemini Assistant] Type 2: Erreur parsing JSON QCM:", e, "Réponse reçue:", geminiResponse); showGlobalIndication("Erreur format réponse Gemini (QCM).", "error"); return; }

            if (!Array.isArray(evaluations)) { console.error("[PV Gemini Assistant] Type 2: Réponse QCM non-tableau:", evaluations); showGlobalIndication("Format réponse Gemini incorrect (QCM).", "error"); return; }

            evaluations.forEach(eva => {
                const phraseInfo = phraseElementsData.find(p => (p.originalIndex + 1) === eva.numero);
                if (phraseInfo) {
                    const targetButton = eva.evaluation.toUpperCase() === "CORRECTE" ? phraseInfo.correctButton : phraseInfo.incorrectButton;
                    if (targetButton) {
                        // Pour les QCM, on n'utilise pas la showGlobalIndication pour chaque item,
                        // mais on surligne directement le bouton. L'indication globale reste sur "Analyse terminée".
                        targetButton.style.outline = '3px solid #28a745';
                        targetButton.style.borderWidth = '3px';
                        targetButton.style.boxShadow = '0 0 10px #28a745';
                    }
                }
            });
            showGlobalIndication(`Analyse (QCM) terminée. Vérifiez les suggestions surlignées.`, "success");

        } catch (error) {
            showGlobalIndication(`Erreur analyse (QCM) : ${error}`, "error");
            console.error("[PV Gemini Assistant] Erreur processMultipleChoiceExercise:", error);
        }
    }

    function apprendreDesCorrections() {
        const correctionIncorrecteNode = document.querySelector('.pointAndClick.answerDisplayed.incorrect .correctionView .correction');
        const confirmationCorrecteNode = document.querySelector('.pointAndClick.answerDisplayed.correct .answerStatusBar.correct.noMistake');

        let typeDeLecon = null;
        let containerPrincipalNode = null;

        if (correctionIncorrecteNode && correctionIncorrecteNode.offsetParent !== null) {
            typeDeLecon = "phrase_unique_correction";
            containerPrincipalNode = document.querySelector('.pointAndClick.answerDisplayed.incorrect');
        } else if (confirmationCorrecteNode && confirmationCorrecteNode.offsetParent !== null) {
            typeDeLecon = "pas_de_faute_confirmation_regle";
            containerPrincipalNode = document.querySelector('.pointAndClick.answerDisplayed.correct');
        }

        if (typeDeLecon && containerPrincipalNode) {
            const containerRegle = containerPrincipalNode.querySelector('.rule-details');
            let phrasePourLecon = "N/A";

            if (typeDeLecon === "phrase_unique_correction") {
                phrasePourLecon = correctionIncorrecteNode.textContent.trim();
            } else if (typeDeLecon === "pas_de_faute_confirmation_regle") {
                const phraseOriginaleNode = containerPrincipalNode.querySelector('.sentence');
                if (phraseOriginaleNode) {
                    phrasePourLecon = phraseOriginaleNode.textContent.trim();
                } else {
                     phrasePourLecon = "Phrase originale non trouvée pour cette règle confirmée.";
                }
            }

            if (containerRegle) {
                const titreRegle = containerRegle.querySelector('.rule-details-title')?.textContent.trim();
                const explicationRegleNode = containerRegle.querySelector('.rule-details-description .explanation');
                const explicationRegle = explicationRegleNode ? explicationRegleNode.textContent.trim() : "";

                if (titreRegle || explicationRegle) {
                    const nouvelleLecon = {
                        type: typeDeLecon,
                        ruleTitle: titreRegle || (typeDeLecon === "phrase_unique_correction" ? "Règle non titrée (correction)" : "Règle non titrée (pas de faute)"),
                        ruleExplanation: explicationRegle,
                        correctedSentence: phrasePourLecon,
                        timestamp: Date.now()
                    };

                    if (!memoireDesCorrections.some(lecon => 
                        lecon.ruleTitle === nouvelleLecon.ruleTitle && 
                        lecon.ruleExplanation === nouvelleLecon.ruleExplanation &&
                        (lecon.type !== "pas_de_faute_confirmation_regle" || lecon.correctedSentence === nouvelleLecon.correctedSentence)
                    )) {
                        memoireDesCorrections.push(nouvelleLecon);
                        if (memoireDesCorrections.length > MAX_MEMOIRES_CORRECTIONS) {
                            memoireDesCorrections.shift();
                        }
                        console.log("[PV Gemini Assistant] Leçon apprise : ", nouvelleLecon);
                    }
                }
            }
        }
    }

    let currentPath = "";
    let analyzeButton = null;
    let uiUpdateTimeout = null;

    function updateUIForCurrentPage() {
        console.log("[PV Gemini Assistant] updateUIForCurrentPage: Vérification...");
        apprendreDesCorrections();

        const qcmPopup = document.querySelector('.popupPanel.intensivePopup .intensiveQuestion');
        const qcmRuleTitle = document.querySelector('.popupPanel.intensivePopup .intensiveRule .rule-details-title');
        const type1ContainerNonAnswer = document.querySelector('.pointAndClickView:not(.answerDisplayed)');
        const type1Sentence = type1ContainerNonAnswer ? type1ContainerNonAnswer.querySelector('.sentence') : null;
        const type1PointAndClickSpans = type1ContainerNonAnswer ? type1ContainerNonAnswer.querySelectorAll('.pointAndClickSpan') : [];

        console.log(`  > Détection QCM - Popup Item: ${qcmPopup ? 'Trouvé' : 'Non trouvé'}`);
        console.log(`  > Détection QCM - Titre Règle: ${qcmRuleTitle ? 'Trouvé' : 'Non trouvé'}`);
        console.log(`  > Détection Type 1 - Conteneur (non-réponse): ${type1ContainerNonAnswer ? 'Trouvé' : 'Non trouvé'}`);
        console.log(`  > Détection Type 1 - Phrase: ${type1Sentence ? 'Trouvé' : 'Non trouvé'}`);
        console.log(`  > Détection Type 1 - Mots cliquables: ${type1PointAndClickSpans.length > 0 ? `Trouvé (${type1PointAndClickSpans.length})` : 'Non trouvé'}`);

        const isQCM = qcmPopup && qcmRuleTitle;
        const isSingleSentence = type1ContainerNonAnswer && type1Sentence && type1PointAndClickSpans.length > 0 && !isQCM;

        const shouldDisplayButton = isQCM || isSingleSentence;
        const isButtonCurrentlyDisplayed = analyzeButton && document.body.contains(analyzeButton);

        if (shouldDisplayButton && !isButtonCurrentlyDisplayed) {
            hideGlobalIndication();
            removeAllStyling();
        } else if (!shouldDisplayButton && isButtonCurrentlyDisplayed) {
            hideGlobalIndication();
            removeAllStyling();
        } else if (!shouldDisplayButton && !isButtonCurrentlyDisplayed) {
             // Si aucun exercice n'est actif et qu'aucun bouton n'est affiché,
             // on peut aussi cacher l'indication au cas où elle serait restée d'une erreur précédente non liée à un exercice.
             // Mais on la laisse si elle est déjà cachée pour éviter des appels inutiles.
             if (globalIndicationBox && globalIndicationBox.style.display !== 'none') {
                // hideGlobalIndication(); // Peut-être trop agressif, à voir.
             }
        }


        if (analyzeButton && document.body.contains(analyzeButton)) {
            analyzeButton.remove();
            analyzeButton = null;
        }

        if (isQCM) {
            console.log("[PV Gemini Assistant] Détection: Exercice QCM (Type 2) actif.");
            analyzeButton = document.createElement('button');
            analyzeButton.id = 'gemini-analyze-button-multi';
            analyzeButton.textContent = 'Analyser QCM (Gemini)';
            analyzeButton.onclick = processMultipleChoiceExercise;
            analyzeButton.style.position = 'fixed'; analyzeButton.style.top = '70px'; analyzeButton.style.right = '20px';
            analyzeButton.style.zIndex = '10000'; analyzeButton.style.padding = '10px 15px';
            analyzeButton.style.backgroundColor = '#34a853'; analyzeButton.style.color = 'white';
            analyzeButton.style.border = 'none'; analyzeButton.style.borderRadius = '8px';
            analyzeButton.style.cursor = 'pointer'; analyzeButton.style.fontFamily = '"Google Sans", Roboto, Arial, sans-serif';
            analyzeButton.style.fontSize = '14px';
            analyzeButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
            document.body.appendChild(analyzeButton);
            if (globalIndicationBox && globalIndicationBox.style.display === 'none') { // N'afficher que si rien n'est déjà affiché
                 showGlobalIndication("Prêt à analyser le QCM.", "info");
            }
        } else if (isSingleSentence) {
            console.log("[PV Gemini Assistant] Détection: Exercice Phrase Unique (Type 1) actif.");
            analyzeButton = document.createElement('button');
            analyzeButton.id = 'gemini-analyze-button-single';
            analyzeButton.textContent = 'Analyser Phrase (Gemini)';
            analyzeButton.onclick = processSingleSentenceCorrection;
            analyzeButton.style.position = 'fixed'; analyzeButton.style.top = '70px'; analyzeButton.style.right = '20px';
            analyzeButton.style.zIndex = '10000'; analyzeButton.style.padding = '10px 15px';
            analyzeButton.style.backgroundColor = '#1a73e8'; analyzeButton.style.color = 'white';
            analyzeButton.style.border = 'none'; analyzeButton.style.borderRadius = '8px';
            analyzeButton.style.cursor = 'pointer'; analyzeButton.style.fontFamily = '"Google Sans", Roboto, Arial, sans-serif';
            analyzeButton.style.fontSize = '14px';
            analyzeButton.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
            document.body.appendChild(analyzeButton);
            if (globalIndicationBox && globalIndicationBox.style.display === 'none') { // N'afficher que si rien n'est déjà affiché
                showGlobalIndication("Prêt à analyser la phrase.", "info");
            }
        } else {
            console.log("[PV Gemini Assistant] Détection: Aucun type d'exercice connu actif pour le moment (ou page de correction/confirmation).");
        }
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        clearTimeout(uiUpdateTimeout);
        uiUpdateTimeout = setTimeout(() => {
            updateUIForCurrentPage();
        }, 750);
    });

    window.addEventListener('load', () => {
        console.log(`[PV Gemini Assistant] Page chargée. Initialisation du script v${GM_info.script.version} (${GEMINI_MODEL_NAME}).`);
        ensureGlobalIndicationBox(); 
        currentPath = window.location.href;
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(updateUIForCurrentPage, 2500);
    });

})();