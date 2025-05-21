# Projet Voltaire Assistant (avec API Gemini)

Un script utilisateur (UserScript) conçu pour assister dans la résolution d'exercices sur le site Projet Voltaire en s'appuyant sur les capacités de l'intelligence artificielle Gemini de Google. Ce script aide à identifier les fautes dans les exercices de type "phrase unique" et à évaluer les phrases dans les exercices de type QCM.

**Versions :**
* Ce projet a évolué et supporte différentes versions des modèles Gemini, notamment `gemini-2.0-flash-001` (dans les versions plus anciennes du script, comme la v0.7.4) et `gemini-2.5-flash-preview-04-17` (dans les versions plus récentes, comme la v0.7.6). Assurez-vous d'utiliser la version du script correspondant au modèle que vous souhaitez utiliser et que votre clé API supporte.

## Fonctionnalités

* **Assistance pour les phrases uniques :**
    * Détecte les exercices où une unique faute doit être trouvée dans une phrase.
    * Envoie la phrase à l'API Gemini pour analyse.
    * Surligne le mot ou groupe de mots identifié comme fautif par l'IA, ou indique si aucune faute n'est suggérée.
* **Assistance pour les QCM :**
    * Détecte les exercices de type QCM où plusieurs phrases doivent être évaluées comme "correctes" ou "incorrectes" en fonction d'une règle grammaticale donnée.
    * Extrait la règle et les phrases.
    * Envoie les informations à l'API Gemini pour évaluation.
    * Surligne les boutons "Correct" ou "Incorrect" suggérés par l'IA pour chaque phrase.
* **Interface utilisateur simple :**
    * Ajoute un bouton discret sur la page de l'exercice pour lancer l'analyse.
    * Affiche des indications claires sur l'état de l'analyse et les suggestions de l'IA.

## Prérequis

1.  **Un navigateur web moderne :** Chrome, Firefox, Edge, Opera, ou tout autre navigateur supportant les extensions de gestion de scripts utilisateur.
2.  **Une extension de gestion de scripts utilisateur :**
    * [Tampermonkey](https://www.tampermonkey.net/) (recommandé, disponible pour la plupart des navigateurs)
    * Greasemonkey (pour Firefox)
    * Violentmonkey (open source, multi-navigateurs)
3.  **Une clé API Gemini :** Vous devez posséder votre propre clé API pour accéder aux modèles Gemini de Google. Les instructions pour l'obtenir et la configurer sont ci-dessous.

## Installation

1.  **Installez l'extension de gestion de scripts utilisateur** de votre choix (par exemple, Tampermonkey) si ce n'est pas déjà fait.
2.  **Obtenez le script :**
    * Cliquez sur le fichier `.user.js` souhaité de ce dépôt GitHub (par exemple, `version_gemini-2.0-flash-001.user.js` ou `version_gemini-2.5-flash-preview-04-17.user.js`).
    * Cliquez sur le bouton "Raw" ou "Brut".
    * Tampermonkey (ou votre extension) devrait automatiquement détecter le script et vous proposer de l'installer.
    * Si cela ne se fait pas automatiquement, copiez le code brut du script. Ouvrez le tableau de bord de Tampermonkey, allez dans l'onglet "Utilitaires" ou créez un nouveau script, puis collez le code et enregistrez.
3.  **Confirmez l'installation** dans Tampermonkey.

## Configuration

Pour que le script fonctionne, vous devez obtenir et configurer votre propre clé API Gemini.

### 1. Obtenir votre Clé API Gemini

Une clé API personnelle pour les modèles Gemini de Google est nécessaire. Voici les étapes générales pour en obtenir une via Google AI Studio :

1.  **Accédez à Google AI Studio :**
    * Ouvrez votre navigateur web et allez sur le site de [Google AI Studio](https://aistudio.google.com/).
2.  **Connectez-vous avec votre compte Google :**
    * Si vous n'êtes pas déjà connecté, connectez-vous avec votre compte Google personnel.
3.  **Acceptez les conditions d'utilisation :**
    * Si c'est votre première visite, vous devrez peut-être lire et accepter les conditions d'utilisation de Google AI Studio et des API Gemini.
4.  **Trouvez l'option pour obtenir une clé API :**
    * Une fois dans Google AI Studio, cherchez une option telle que "**Get API key**" (Obtenir une clé API) ou "**Create API key**" (Créer une clé API). Cette option est souvent située dans le menu de navigation à gauche (parfois sous "API key") ou via un bouton proéminent.
    * L'interface de Google AI Studio peut évoluer, mais l'option est généralement bien visible.
5.  **Créez une nouvelle clé API :**
    * Vous aurez probablement l'option de "Créer une clé API dans un nouveau projet" ("Create API key in new project") ou d'utiliser un projet existant. Pour une première utilisation simple, créer un nouveau projet est souvent le plus direct.
    * Cliquez sur le bouton pour générer la clé.
6.  **Copiez et sauvegardez votre clé API :**
    * Une fois la clé générée, elle s'affichera à l'écran. **C'est une chaîne de caractères longue et unique.**
    * **Copiez cette clé immédiatement.**
    * **Conservez-la en lieu sûr et ne la partagez pas publiquement.** Traitez-la comme un mot de passe.

**Conseils importants concernant votre clé API :**

* **Sécurité :** Ne publiez jamais votre clé API dans un endroit public (comme un dépôt GitHub public, un forum, etc.). Si vous pensez que votre clé a été compromise, vous devriez pouvoir la révoquer et en générer une nouvelle via Google AI Studio.
* **Quotas et facturation :** L'API Gemini est souvent proposée avec un niveau d'utilisation gratuit (free tier) qui est généralement suffisant pour un usage personnel et des tests (par exemple, le modèle `gemini-2.0-flash-001` ou `gemini-2.5-flash-preview-04-17` peut avoir une limite de requêtes par minute, comme 60 RPM pour certains modèles Flash en accès gratuit). Cependant, soyez conscient des [limites de quota et des conditions de tarification officielles](https://ai.google.dev/pricing) si votre usage devient intensif. La gestion de ces aspects relève de votre responsabilité.

### 2. Insérer la Clé API dans le Script

Une fois votre clé API obtenue :

1.  **Ouvrez le script pour l'éditer :**
    * Allez dans le tableau de bord de Tampermonkey (ou de votre gestionnaire de scripts).
    * Trouvez "Projet Voltaire Assistant" (ou le nom exact du script que vous avez installé) dans la liste de vos scripts.
    * Cliquez sur l'icône d'édition correspondante.
2.  **Localisez la ligne de configuration de la clé API :**
    Au début du script, vous trouverez une ligne comme celle-ci :
    ```javascript
    const GEMINI_API_KEY = 'VOTRE_CLE_API_GEMINI_ICI';
    ```
    *(Note : Dans les versions partagées, il peut y avoir une clé d'exemple `AIzaSy...` ; remplacez-la.)*
3.  **Remplacez `'VOTRE_CLE_API_GEMINI_ICI'`** par votre propre clé API Gemini que vous venez de copier. Assurez-vous que la clé est bien entre les guillemets simples.
    Par exemple :
    ```javascript
    const GEMINI_API_KEY = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    ```
4.  **Enregistrez les modifications** du script (souvent via un bouton "Enregistrer", "Sauvegarder", ou la combinaison de touches Ctrl+S).

Le script est maintenant prêt à être utilisé !

## Utilisation

1.  Naviguez vers le site [Projet Voltaire](https://www.projet-voltaire.fr/) et connectez-vous.
2.  Accédez à un module d'entraînement contenant des exercices de type "phrase unique" ou QCM.
3.  Lorsque le script détecte un exercice compatible, un bouton "Analyser Phrase (Gemini)" ou "Analyser QCM (Gemini)" apparaîtra (généralement en haut à droite de la page).
4.  Cliquez sur ce bouton pour envoyer la question à l'API Gemini.
5.  Des indications apparaîtront pour vous informer de l'état de l'analyse et des suggestions de l'IA.

## Avertissement / Clause de non-responsabilité

* Ce script est fourni **"TEL QUEL"**, sans aucune garantie de bon fonctionnement, d'exactitude des réponses fournies par l'IA, ou de compatibilité continue avec le site Projet Voltaire (qui peut changer sa structure à tout moment).
* L'utilisation de ce script est à **vos propres risques**. Les réponses fournies par l'intelligence artificielle Gemini peuvent contenir des erreurs ou des imprécisions. Ce script est un outil d'assistance et ne doit pas être utilisé pour tricher ou remplacer l'apprentissage personnel.
* **L'auteur de ce script n'est pas responsable** de la manière dont vous utilisez ce script, des conséquences de son utilisation (y compris, mais sans s'y limiter, les résultats obtenus sur le Projet Voltaire), ou de toute violation des conditions d'utilisation du Projet Voltaire ou de l'API Gemini.
* Vous êtes responsable de la gestion et de la sécurisation de votre clé API Gemini, ainsi que des coûts éventuels associés à son utilisation.
* L'objectif de ce script est d'aider à la compréhension et à l'apprentissage, et non de contourner le processus éducatif.

## Auteurs

* [mkyousuke]
* Partenaire de code (Gemini Pro)

---

# Projet Voltaire Assistant (with Gemini API)

A UserScript designed to assist in solving exercises on the Projet Voltaire website by leveraging the capabilities of Google's Gemini AI. This script helps identify errors in "single sentence" type exercises and evaluate sentences in MCQ (Multiple Choice Question) type exercises.

**Versions:**
* This project has evolved and supports different versions of Gemini models, notably `gemini-2.0-flash-001` (in older script versions, like v0.7.4) and `gemini-2.5-flash-preview-04-17` (in more recent versions, like v0.7.6). Ensure you use the script version corresponding to the model you wish to use and that your API key supports.

## Features

* **Single Sentence Assistance:**
    * Detects exercises where a single error needs to be found in a sentence.
    * Sends the sentence to the Gemini API for analysis.
    * Highlights the word or group of words identified as incorrect by the AI, or indicates if no error is suggested.
* **MCQ Assistance:**
    * Detects MCQ exercises where multiple sentences must be evaluated as "correct" or "incorrect" based on a given grammatical rule.
    * Extracts the rule and sentences.
    * Sends the information to the Gemini API for evaluation.
    * Highlights the "Correct" or "Incorrect" buttons suggested by the AI for each sentence.
* **Simple User Interface:**
    * Adds a discreet button on the exercise page to initiate the analysis.
    * Displays clear indications of the analysis status and AI suggestions.

## Prerequisites

1.  **A modern web browser:** Chrome, Firefox, Edge, Opera, or any other browser supporting user script management extensions.
2.  **A user script management extension:**
    * [Tampermonkey](https://www.tampermonkey.net/) (recommended, available for most browsers)
    * Greasemonkey (for Firefox)
    * Violentmonkey (open source, cross-browser)
3.  **A Gemini API Key:** You must have your own API key to access Google's Gemini models. Instructions to obtain and configure it are below.

## Installation

1.  **Install your chosen user script management extension** (e.g., Tampermonkey) if you haven't already.
2.  **Get the script:**
    * Click on the desired `.user.js` file from this GitHub repository (e.g., `version_gemini-2.0-flash-001.user.js` or `version_gemini-2.5-flash-preview-04-17.user.js`).
    * Click the "Raw" button.
    * Tampermonkey (or your extension) should automatically detect the script and offer to install it.
    * If this doesn't happen automatically, copy the raw code of the script. Open the Tampermonkey dashboard, go to the "Utilities" tab or create a new script, then paste the code and save.
3.  **Confirm the installation** in Tampermonkey.

## Configuration

For the script to work, you must obtain and configure your own Gemini API key.

### 1. Obtain your Gemini API Key

A personal API key for Google's Gemini models is required. Here are the general steps to get one via Google AI Studio:

1.  **Go to Google AI Studio:**
    * Open your web browser and navigate to the [Google AI Studio](https://aistudio.google.com/) website.
2.  **Sign in with your Google account:**
    * If you are not already signed in, sign in with your personal Google account.
3.  **Accept the terms of service:**
    * If this is your first visit, you may need to read and accept the terms of service for Google AI Studio and the Gemini APIs.
4.  **Find the option to get an API key:**
    * Once in Google AI Studio, look for an option like "**Get API key**" or "**Create API key**". This option is often located in the left navigation menu (sometimes under "API key") or via a prominent button.
    * The Google AI Studio interface may change, but the option is usually clearly visible.
5.  **Create a new API key:**
    * You will likely have the option to "Create API key in new project" or use an existing project. For a simple first-time use, creating a new project is often the most straightforward.
    * Click the button to generate the key.
6.  **Copy and save your API key:**
    * Once the key is generated, it will be displayed on the screen. **It is a long and unique string of characters.**
    * **Copy this key immediately.**
    * **Keep it in a safe place and do not share it publicly.** Treat it like a password.

**Important tips regarding your API key:**

* **Security:** Never publish your API key in a public place (like a public GitHub repository, forum, etc.). If you believe your key has been compromised, you should be able to revoke it and generate a new one via Google AI Studio.
* **Quotas and Billing:** The Gemini API is often offered with a free tier, which is generally sufficient for personal use and testing (e.g., `gemini-2.0-flash-001` or `gemini-2.5-flash-preview-04-17` models might have a request per minute limit, such as 60 RPM for some Flash models on free access). However, be aware of the [official quota limits and pricing terms](https://ai.google.dev/pricing) if your usage becomes intensive. Managing these aspects is your responsibility.

### 2. Insert the API Key into the Script

Once you have obtained your API key:

1.  **Open the script for editing:**
    * Go to the Tampermonkey dashboard (or your script manager's dashboard).
    * Find "Projet Voltaire Assistant" (or the exact name of the script you installed) in your list of scripts.
    * Click the corresponding edit icon.
2.  **Locate the API key configuration line:**
    At the beginning of the script, you will find a line similar to this:
    ```javascript
    const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
    ```
    *(Note: Shared versions might have an example key like `AIzaSy...`; replace it.)*
3.  **Replace `'YOUR_GEMINI_API_KEY_HERE'`** with your own Gemini API key that you just copied. Ensure the key is enclosed in single quotes.
    For example:
    ```javascript
    const GEMINI_API_KEY = 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    ```
4.  **Save the changes** to the script (often via a "Save" button or the Ctrl+S key combination).

The script is now ready to use!

## Usage

1.  Navigate to the [Projet Voltaire](https://www.projet-voltaire.fr/) website and log in.
2.  Access a training module containing "single sentence" or MCQ type exercises.
3.  When the script detects a compatible exercise, an "Analyser Phrase (Gemini)" (Analyze Sentence) or "Analyser QCM (Gemini)" (Analyze MCQ) button will appear (usually at the top right of the page).
4.  Click this button to send the question to the Gemini API.
5.  Indications will appear to inform you of the analysis status and the AI's suggestions.

## Warning / Disclaimer

* This script is provided **"AS IS"**, without any warranty of proper functioning, accuracy of AI-provided answers, or continued compatibility with the Projet Voltaire website (which may change its structure at any time).
* Use of this script is at **your own risk**. Responses provided by the Gemini AI may contain errors or inaccuracies. This script is an assistance tool and should not be used to cheat or replace personal learning.
* **The author of this script is not responsible** for how you use this script, the consequences of its use (including, but not limited to, results obtained on Projet Voltaire), or any violation of the Projet Voltaire or Gemini API terms of service.
* You are responsible for managing and securing your Gemini API key, as well as any potential costs associated with its use.
* The purpose of this script is to aid understanding and learning, not to bypass the educational process.

## Authors

* [mkyousuke]
* Partenaire de code (Gemini Pro)