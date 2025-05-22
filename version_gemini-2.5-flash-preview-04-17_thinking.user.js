// ==UserScript==
// @name         Projet Voltaire Assistant (Gemini 2.5 Flash)
// @namespace    http://tampermonkey.net/
// @version      0.9.1 // Ajout du bouton pour utiliser manuellement une règle mémorisée, amélioration de la précision, ajout d'une notification en cas de règle mémorisée utilisée. 
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
    const MAX_MEMOIRES_CORRECTIONS = 10;

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
        globalIndicationBox.dataset.originalMessage = message;
        globalIndicationBox.dataset.messageType = type;
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
        let memorizedRulesWereAddedToPrompt = false;
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
            memorizedRulesWereAddedToPrompt = true;
        }

        console.log(`[PV Gemini Assistant] Instruction Système Combinée envoyée:`, finalSystemInstruction || "Aucune");
        console.log(`[PV Gemini Assistant] Prompt (contents) envoyé à ${GEMINI_MODEL_NAME}:`, promptText);
        console.log(`[PV Gemini Assistant] Paramètres: temp=${temperature}, maxTokens=${maxOutputTokens}, thinkingBudget=${customThinkingBudget}`);

        if (memorizedRulesWereAddedToPrompt) {
            if (globalIndicationBox &&
                globalIndicationBox.style.display === 'block' &&
                globalIndicationBox.dataset.messageType === 'loading' &&
                globalIndicationBox.dataset.originalMessage &&
                globalIndicationBox.innerHTML.includes("Analyse en cours")) {
                const originalLoadingMessage = globalIndicationBox.dataset.originalMessage;
                const newMessage = originalLoadingMessage + "<br><small style='font-style:italic; color:#5f6368;'>Application du contexte des règles mémorisées.</small>";
                globalIndicationBox.innerHTML = newMessage;
            } else {
                 console.log("[PV Gemini Assistant] Contexte des règles mémorisées appliqué (message non affiché/appendu car pas de 'loading' spécifique actif).");
            }
        }

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

    async function analyzeSentenceWithFocus(focusType) {
        const sentenceElement = document.querySelector('.pointAndClickView .sentence');
        const noMistakeButton = document.querySelector('.pointAndClickView .noMistakeButton');

        if (document.querySelector('.popupPanel.intensivePopup .intensiveQuestion')) {
            console.log(`[PV Gemini Assistant] analyzeSentenceWithFocus (${focusType}): Annulé, un QCM semble actif.`);
            return;
        }
        if (!sentenceElement || !noMistakeButton) {
            console.log(`[PV Gemini Assistant] analyzeSentenceWithFocus (${focusType}): Conditions non remplies.`);
            return;
        }
        const sentenceText = sentenceElement.textContent.trim();
        if (!sentenceText) return;

        let specificSystemInstruction = `Tu es un correcteur grammatical, orthographique, et syntaxique expert de la langue française.`;
        let loadingMessagePrefix = "Analyse (Phrase unique)";

        if (focusType === 'memorized_rules') {
            if (memoireDesCorrections.length === 0) {
                showGlobalIndication("Aucune règle mémorisée à utiliser.", "warning");
                setTimeout(hideGlobalIndication, 3000);
                return;
            }
            specificSystemInstruction = `Tu es un assistant expert. Pour l'analyse suivante, concentre-toi INTENSÉMENT sur les 'Leçons' (règles mémorisées) qui te sont fournies dans ton contexte système. Essaie d'identifier si l'une d'elles s'applique directement à la phrase. Ta réponse doit être basée en priorité sur ces leçons. Les règles générales du français s'appliquent aussi.`;
            loadingMessagePrefix = "Analyse (règles mémorisées)";
        }

        console.log(`[PV Gemini Assistant] Type 1 (${focusType}) détectée : "${sentenceText}"`);
        showGlobalIndication(`${loadingMessagePrefix} en cours avec ${GEMINI_MODEL_NAME}...`, "loading");

        const prompt = `Analyse la phrase suivante pour identifier une unique faute (la plus évidente ou la première rencontrée s'il y en a plusieurs). Types de fautes : orthographe, grammaire, conjugaison, accord, typographie, syntaxe. Phrase : "${sentenceText}"
Instructions pour le format de réponse :
1. Si une faute est trouvée, réponds avec le mot/groupe de mots fautif exact.
2. IMPORTANT: Si le mot/groupe de mots fautif exact apparaît plusieurs fois dans la phrase, tu DOIS préfixer ta réponse par son numéro d'occurrence en toutes lettres (premier, première, deuxième, troisième, etc.), suivi d'un espace, puis du mot/groupe de mots fautif. Exemple: si la faute est le deuxième mot "erreur" dans la phrase, réponds "deuxième erreur". Si c'est le premier, réponds "premier erreur". Si une seule occurrence ou si ce n'est pas pertinent, réponds juste avec le mot/groupe de mots fautif.
3. Si la phrase est correcte (AUCUNE faute de quelque type que ce soit), réponds UNIQUEMENT avec la chaîne de caractères "AUCUNE_FAUTE".
Ne fournis JAMAIS d'explication ou de commentaire. Exemples de réponse si faute: "chat", "deuxième chat", "la erreurs", "premier les". Exemple si correcte: "AUCUNE_FAUTE".`;

        try {
            const singleSentenceThinkingBudget = 512;
            const estimatedResponseTokens = 80;
            const singleSentenceMaxOutputTokens = singleSentenceThinkingBudget + estimatedResponseTokens + 70;

            console.log(`[PV Gemini Assistant] ${loadingMessagePrefix}: thinkingBudget=${singleSentenceThinkingBudget}, calculatedMaxOutputTokens=${singleSentenceMaxOutputTokens}`);

            const geminiResponse = await callGeminiAPI(prompt, 0.1, singleSentenceMaxOutputTokens, singleSentenceThinkingBudget, specificSystemInstruction);

            if ((!geminiResponse && geminiResponse !== "") || geminiResponse === null || typeof geminiResponse === 'undefined') {
                 showGlobalIndication("Aucune réponse de Gemini ou clé API non configurée.", "error");
                 return;
            }

            const geminiOutputForDisplay = geminiResponse.trim();
            const normalizedResponseCheck = geminiOutputForDisplay.toUpperCase().replace(/[\s.]/g, '');

            if (normalizedResponseCheck === "AUCUNE_FAUTE") {
                showGlobalIndication(`${GEMINI_MODEL_NAME} suggère : Aucune faute. <br>👉 Cliquez sur 'IL N'Y A PAS DE FAUTE'.`, "success");
                if(noMistakeButton) { noMistakeButton.style.outline = '3px solid green'; noMistakeButton.style.borderWidth = '3px'; noMistakeButton.style.boxShadow = '0 0 10px green'; }
            } else {
                let occurrence = 1;
                let faultySegmentToSearch = geminiOutputForDisplay;

                const ordinalRegex = /^(premier|première|deuxième|troisième|quatrième|cinquième)\s+(.+)/i;
                const matchOrdinal = geminiOutputForDisplay.match(ordinalRegex);

                if (matchOrdinal) {
                    const ordinalStr = matchOrdinal[1].toLowerCase();
                    faultySegmentToSearch = matchOrdinal[2].trim();
                    switch (ordinalStr) {
                        case 'premier': case 'première': occurrence = 1; break;
                        case 'deuxième': occurrence = 2; break;
                        case 'troisième': occurrence = 3; break;
                        case 'quatrième': occurrence = 4; break;
                        case 'cinquième': occurrence = 5; break;
                    }
                    console.log(`[PV Gemini Assistant] Occurrence spécifiée: ${ordinalStr} (${occurrence}), segment à chercher: "${faultySegmentToSearch}"`);
                } else {
                    faultySegmentToSearch = faultySegmentToSearch.trim();
                    console.log(`[PV Gemini Assistant] Aucune occurrence spécifiée, segment à chercher: "${faultySegmentToSearch}"`);
                }

                if (!faultySegmentToSearch) {
                     showGlobalIndication(`Réponse de ${GEMINI_MODEL_NAME} non exploitable: "${geminiOutputForDisplay}"`, "warning");
                     return;
                }

                const wordsToClickElements = Array.from(document.querySelectorAll('.pointAndClickView .sentence .pointAndClickSpan'));
                let foundElement = null;
                let queryForExactHighlight = faultySegmentToSearch;

                const allExactMatches = wordsToClickElements.filter(el => el.textContent.trim() === queryForExactHighlight);
                if (allExactMatches.length > 0 && occurrence <= allExactMatches.length) {
                    foundElement = allExactMatches[occurrence - 1];
                    console.log(`[PV Gemini Assistant] ${occurrence}e occurrence (exacte) trouvée pour "${queryForExactHighlight}"`);
                }

                if (!foundElement) {
                    const allExactMatchesCaseInsensitive = wordsToClickElements.filter(el => el.textContent.trim().toLowerCase() === queryForExactHighlight.toLowerCase());
                    if (allExactMatchesCaseInsensitive.length > 0 && occurrence <= allExactMatchesCaseInsensitive.length) {
                        foundElement = allExactMatchesCaseInsensitive[occurrence - 1];
                        console.log(`[PV Gemini Assistant] ${occurrence}e occurrence (casse ignorée) trouvée pour "${queryForExactHighlight}"`);
                    }
                }

                if (!foundElement) {
                    console.log(`[PV Gemini Assistant] Pas de correspondance exacte/ordinale pour "${queryForExactHighlight}", tentative de recherche approximative.`);
                    let fuzzyQuery = queryForExactHighlight;
                    if (!/^[.,;:!?]+$/.test(fuzzyQuery) && fuzzyQuery.length > 1) {
                         fuzzyQuery = fuzzyQuery.replace(/[.,;:!?]$/, '').trim();
                    }
                    if (fuzzyQuery === "" && queryForExactHighlight.length > 0) {
                        fuzzyQuery = queryForExactHighlight;
                    }

                    const lowerFuzzyQuery = fuzzyQuery.toLowerCase();
                    let candidates = [];
                    for (let i = 0; i < wordsToClickElements.length; i++) {
                        const el = wordsToClickElements[i];
                        const elTextTrimmed = el.textContent.trim();
                        const lowerElText = elTextTrimmed.toLowerCase();
                        let score = 0;
                        if (lowerElText === "") continue;

                        if (lowerElText.includes(lowerFuzzyQuery)) {
                            score = 90 - (lowerElText.length - lowerFuzzyQuery.length);
                             if (lowerElText === lowerFuzzyQuery) score += 20;
                        } else if (lowerFuzzyQuery.includes(lowerElText)) {
                            if (lowerElText.length > 2) { score = 70 + lowerElText.length; }
                            else if (lowerElText.length > 0 && lowerFuzzyQuery.split(/\s+/).length === 1 && lowerFuzzyQuery.length <= 3) { score = 75; }
                        }
                        if (score > 0) {
                            candidates.push({ element: el, score: score, index: i, text: elTextTrimmed });
                        }
                    }
                    if (candidates.length === 0 && queryForExactHighlight.includes(' ')) {
                        const responseWords = queryForExactHighlight.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                        for (let i = 0; i < wordsToClickElements.length; i++) {
                            const el = wordsToClickElements[i];
                            const spanTextLower = el.textContent.trim().toLowerCase();
                            if (spanTextLower !== "" && responseWords.some(rw => spanTextLower.includes(rw) || rw.includes(spanTextLower))) {
                                candidates.push({element: el, score: 40 + spanTextLower.length, index: i, text: el.textContent.trim()});
                            }
                        }
                    }
                    if (candidates.length > 0) {
                        candidates.sort((a, b) => {
                            if (b.score !== a.score) { return b.score - a.score; }
                            return a.index - b.index;
                        });
                        foundElement = candidates[0].element;
                        console.log(`[PV Gemini Assistant] Meilleure correspondance (fuzzy) trouvée (score ${candidates[0].score}, index ${candidates[0].index}): "${candidates[0].text}" pour la requête Gemini "${geminiOutputForDisplay}" (segment cherché: "${faultySegmentToSearch}", fuzzy: "${fuzzyQuery}")`);
                    }
                }
                let indicationMessage = `${GEMINI_MODEL_NAME} suggère une faute sur/près de&nbsp;: "<b>${geminiOutputForDisplay}</b>". <br>👉 Cliquez sur le mot/groupe surligné.`;
                if (foundElement) {
                    showGlobalIndication(indicationMessage, "info");
                    foundElement.style.outline = '3px solid red'; foundElement.style.borderWidth = '3px';  foundElement.style.boxShadow = '0 0 10px red';
                } else {
                     showGlobalIndication(`${GEMINI_MODEL_NAME} a indiqué&nbsp;: "<b>${geminiOutputForDisplay}</b>", mais non trouvé ou occurrence spécifiée invalide. Vérifiez ou considérez "aucune faute".`, "warning");
                }
            }
        } catch (error) {
            showGlobalIndication(`Erreur ${loadingMessagePrefix} : ${error}`, "error");
            console.error(`[PV Gemini Assistant] Erreur analyzeSentenceWithFocus (${focusType}):`, error);
        }
    }

    async function processSingleSentenceCorrection() {
        await analyzeSentenceWithFocus('general');
    }

    async function analyzeWithMemorizedRules() {
        await analyzeSentenceWithFocus('memorized_rules');
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
                        showGlobalIndication("Règle mémorisée", "success");
                    }
                }
            }
        }
    }

    async function forcerMemorisationRegle() {
        let leconContextNode = null;
        let typeDeLeconAssocie = "regle_manuelle";
        let phrasePourLeconAssociee = "N/A";

        const incorrectCtx = document.querySelector('.pointAndClick.answerDisplayed.incorrect');
        const correctCtx = document.querySelector('.pointAndClick.answerDisplayed.correct');

        if (incorrectCtx && incorrectCtx.querySelector('.rule-details .rule-details-title')?.offsetParent !== null) {
            leconContextNode = incorrectCtx;
            typeDeLeconAssocie = "phrase_unique_correction";
            const correctionNode = leconContextNode.querySelector('.correctionView .correction');
            phrasePourLeconAssociee = correctionNode ? correctionNode.textContent.trim() : (leconContextNode.querySelector('.sentence')?.textContent.trim() || "N/A");
        } else if (correctCtx && correctCtx.querySelector('.rule-details .rule-details-title')?.offsetParent !== null) {
            leconContextNode = correctCtx;
            typeDeLeconAssocie = "pas_de_faute_confirmation_regle";
            const sentenceNode = leconContextNode.querySelector('.sentence');
            if (sentenceNode) phrasePourLeconAssociee = sentenceNode.textContent.trim();
        }

        if (!leconContextNode) {
            showGlobalIndication("Contexte de règle non trouvé pour mémorisation.", "error");
            console.warn("[PV Gemini Assistant] Mémorisation forcée: Contexte de règle non trouvé au moment du clic.");
            return;
        }

        const containerRegle = leconContextNode.querySelector('.rule-details');
        if (!containerRegle) {
            showGlobalIndication("Détails de la règle introuvables.", "error");
            console.warn("[PV Gemini Assistant] Mémorisation forcée: .rule-details non trouvé dans le contexte identifié.");
            return;
        }

        const titreRegle = containerRegle.querySelector('.rule-details-title')?.textContent.trim();
        const explicationRegleNode = containerRegle.querySelector('.rule-details-description .explanation');
        const explicationRegle = explicationRegleNode ? explicationRegleNode.textContent.trim() : "";

        if (!titreRegle && !explicationRegle) {
            showGlobalIndication("Titre et explication de la règle manquants.", "error");
            return;
        }

        const nouvelleLecon = {
            type: typeDeLeconAssocie,
            ruleTitle: titreRegle || "Règle (sans titre)",
            ruleExplanation: explicationRegle,
            correctedSentence: phrasePourLeconAssociee,
            timestamp: Date.now()
        };

        const initialLength = memoireDesCorrections.length;
        memoireDesCorrections = memoireDesCorrections.filter(lecon =>
            !(lecon.ruleTitle === nouvelleLecon.ruleTitle && lecon.ruleExplanation === nouvelleLecon.ruleExplanation)
        );
        if (memoireDesCorrections.length < initialLength) {
            console.log("[PV Gemini Assistant] Ancienne version de la règle correspondante retirée pour remplacement.");
        }

        memoireDesCorrections.push(nouvelleLecon);

        if (memoireDesCorrections.length > MAX_MEMOIRES_CORRECTIONS) {
            memoireDesCorrections.shift();
        }

        console.log("[PV Gemini Assistant] Règle mémorisée/mise à jour (Forcé) : ", nouvelleLecon, "Mémoire actuelle:", memoireDesCorrections.map(m => m.ruleTitle));
        showGlobalIndication("Règle mémorisée", "success");
    }

    let currentPath = "";
    let analyzeButton = null;
    let memorizeRuleButton = null;
    let useMemorizedRuleButton = null; // Nouveau bouton
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

        const shouldDisplayAnalyzeButton = isQCM || isSingleSentence;
        const isAnalyzeButtonCurrentlyDisplayed = analyzeButton && document.body.contains(analyzeButton);

        if (shouldDisplayAnalyzeButton && !isAnalyzeButtonCurrentlyDisplayed) {
            hideGlobalIndication();
            removeAllStyling();
        } else if (!shouldDisplayAnalyzeButton && isAnalyzeButtonCurrentlyDisplayed) {
            hideGlobalIndication();
            removeAllStyling();
        } else if (!shouldDisplayAnalyzeButton && !isAnalyzeButtonCurrentlyDisplayed) {
             if (globalIndicationBox && globalIndicationBox.style.display !== 'none') {
             }
        }

        if (analyzeButton && document.body.contains(analyzeButton)) {
            analyzeButton.remove();
            analyzeButton = null;
        }

        if (isQCM) {
            analyzeButton = document.createElement('button');
            analyzeButton.id = 'gemini-analyze-button-multi';
            analyzeButton.textContent = 'Analyser QCM (Gemini)';
            analyzeButton.onclick = processMultipleChoiceExercise;
             Object.assign(analyzeButton.style, {position: 'fixed', top: '70px', right: '20px', zIndex: '10000', padding: '10px 15px', backgroundColor: '#34a853', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'});
            document.body.appendChild(analyzeButton);
            if (globalIndicationBox && globalIndicationBox.style.display === 'none') {
                 showGlobalIndication("Prêt à analyser le QCM.", "info");
            }
        } else if (isSingleSentence) {
            analyzeButton = document.createElement('button');
            analyzeButton.id = 'gemini-analyze-button-single';
            analyzeButton.textContent = 'Analyser Phrase (Gemini)';
            analyzeButton.onclick = processSingleSentenceCorrection;
            Object.assign(analyzeButton.style, {position: 'fixed', top: '70px', right: '20px', zIndex: '10000', padding: '10px 15px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'});
            document.body.appendChild(analyzeButton);
            if (globalIndicationBox && globalIndicationBox.style.display === 'none') {
                showGlobalIndication("Prêt à analyser la phrase.", "info");
            }
        } else {
            console.log("[PV Gemini Assistant] Détection: Aucun type d'exercice connu actif pour le moment (ou page de correction/confirmation).");
        }

        if (memorizeRuleButton && document.body.contains(memorizeRuleButton)) {
            memorizeRuleButton.remove();
            memorizeRuleButton = null;
        }
        if (useMemorizedRuleButton && document.body.contains(useMemorizedRuleButton)) {
            useMemorizedRuleButton.remove();
            useMemorizedRuleButton = null;
        }

        let ruleIsVisibleForManualMemorization = false;
        const answerDisplayedIncorrect = document.querySelector('.pointAndClick.answerDisplayed.incorrect');
        const answerDisplayedCorrect = document.querySelector('.pointAndClick.answerDisplayed.correct');

        if (answerDisplayedIncorrect && answerDisplayedIncorrect.querySelector('.rule-details .rule-details-title')?.offsetParent !== null) {
            ruleIsVisibleForManualMemorization = true;
        } else if (answerDisplayedCorrect && answerDisplayedCorrect.querySelector('.rule-details .rule-details-title')?.offsetParent !== null) {
            ruleIsVisibleForManualMemorization = true;
        }

        let topOffsetForButtons = 70;
        const analyzeButtonExists = analyzeButton && document.body.contains(analyzeButton);
        if (analyzeButtonExists) topOffsetForButtons = 120;


        if (ruleIsVisibleForManualMemorization) {
            memorizeRuleButton = document.createElement('button');
            memorizeRuleButton.id = 'gemini-memorize-rule-button';
            memorizeRuleButton.textContent = 'Mémoriser la règle';
            memorizeRuleButton.onclick = forcerMemorisationRegle;
            Object.assign(memorizeRuleButton.style, {position: 'fixed', top: `${topOffsetForButtons}px`, right: '20px', zIndex: '9999', padding: '8px 12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'});
            document.body.appendChild(memorizeRuleButton);
            topOffsetForButtons += 50; // Increment offset for the next button
        }

        if (isSingleSentence && memoireDesCorrections.length > 0) {
            useMemorizedRuleButton = document.createElement('button');
            useMemorizedRuleButton.id = 'gemini-use-memorized-rule-button';
            useMemorizedRuleButton.textContent = 'Utiliser règle mémorisée';
            useMemorizedRuleButton.onclick = analyzeWithMemorizedRules;
            Object.assign(useMemorizedRuleButton.style, {position: 'fixed', top: `${topOffsetForButtons}px`, right: '20px', zIndex: '9998', padding: '8px 12px', backgroundColor: '#20c997', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'});
            document.body.appendChild(useMemorizedRuleButton);
        }
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        clearTimeout(uiUpdateTimeout);
        uiUpdateTimeout = setTimeout(() => {
            updateUIForCurrentPage();
        }, 750);
    });

    window.addEventListener('load', () => {
        const scriptVersion = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.version : 'unknown';
        console.log(`[PV Gemini Assistant] Page chargée. Initialisation du script v${scriptVersion} (${GEMINI_MODEL_NAME}).`);
        ensureGlobalIndicationBox();
        currentPath = window.location.href;
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(updateUIForCurrentPage, 2500);
    });

})();