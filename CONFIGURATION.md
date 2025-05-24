# ⚙️ Installation et Configuration de l'Assistant Projet Voltaire

Ce guide vous explique comment installer et configurer l'Assistant Projet Voltaire, que ce soit en tant qu'Extension de Navigateur (recommandé) ou en tant que Script Tampermonkey.

## 1. Prérequis Indispensable : Obtenir votre Clé API Gemini

L'assistant a besoin d'une clé API personnelle pour communiquer avec les modèles d'intelligence artificielle Gemini de Google.

1.  **Accédez à Google AI Studio :** Ouvrez [Google AI Studio](https://aistudio.google.com/) dans votre navigateur.
2.  **Connectez-vous :** Utilisez votre compte Google.
3.  **Acceptez les conditions :** Si c'est votre première visite.
4.  **Obtenez une clé API :**
    * Cherchez une option comme "**Get API key**" ou "**Create API key**".
    * Choisissez de "**Créer une clé API dans un nouveau projet**" (ou utilisez un projet existant).
5.  **Copiez et sauvegardez votre clé :** Elle s'affichera à l'écran (une longue chaîne de caractères). **Conservez-la précieusement et ne la partagez pas.**

**💡 Conseils importants pour votre clé API :**
* **Sécurité :** Ne la publiez jamais. Si compromise, révoquez-la et générez-en une nouvelle via Google AI Studio.
* **Quotas et Facturation :** L'API Gemini propose généralement un niveau gratuit suffisant pour cet usage. Consultez les [conditions de tarification officielles](https://ai.google.dev/pricing) pour plus de détails.

---

## 2. Méthode d'Installation (Choisissez-en une)

### A. Extension de Navigateur (⭐ Recommandé)

C'est la méthode la plus simple et la plus robuste, offrant la persistance des données (votre clé API et les règles mémorisées sont sauvegardées).

**Instructions d'installation (Exemple pour Chrome) :**

1.  **Téléchargez le dossier de l'extension :**
    * Depuis ce dépôt GitHub, téléchargez le contenu du dossier `Extension/`. Vous devriez avoir un dossier local contenant `manifest.json`, `assistant_script.js`, `options.html`, `options.js`, et un sous-dossier `images/`.
2.  **Ouvrez la page des extensions de votre navigateur :**
    * Pour Chrome/Edge : Tapez `chrome://extensions` dans la barre d'adresse.
    * Pour Firefox : Tapez `about:debugging#/runtime/this-firefox` dans la barre d'adresse.
3.  **Activez le Mode Développeur :**
    * Sur Chrome/Edge, activez l'interrupteur "Mode développeur" (souvent en haut à droite).
4.  **Chargez l'extension :**
    * **Chrome/Edge :** Cliquez sur "Charger l'extension non empaquetée" et sélectionnez le dossier `Extension/` que vous avez téléchargé et décompressé.
    * **Firefox :** Cliquez sur "Charger un module complémentaire temporaire..." et sélectionnez le fichier `manifest.json` à l'intérieur du dossier `Extension/`. (Note : pour une installation permanente sur Firefox, l'extension devrait être signée, ce qui est un processus plus avancé. Pour un usage personnel, le chargement temporaire fonctionne bien mais doit être refait à chaque redémarrage de Firefox, ou vous pouvez explorer les options de signature pour développeurs).
5.  L'icône de l'Assistant Projet Voltaire devrait apparaître dans la barre d'outils de votre navigateur.

**Configuration de l'Extension :**

1.  **Ouvrez les options de l'extension :**
    * Faites un clic droit sur l'icône de l'Assistant Projet Voltaire dans la barre d'outils de votre navigateur et sélectionnez "Options".
    * Si l'icône n'est pas visible, allez dans la page des extensions, trouvez "Assistant Projet Voltaire" et cliquez sur "Détails" puis "Options de l'extension".
2.  **Entrez votre clé API Gemini :** Dans le champ prévu à cet effet sur la page d'options.
3.  **Ajustez les autres paramètres (optionnel) :**
    * Nombre maximum de règles à mémoriser.
    * Budgets de réflexion pour les différentes analyses de l'IA.
4.  **Cliquez sur "Enregistrer les Options".**

L'extension est maintenant prête à être utilisée sur le site [Projet Voltaire](https://www.projet-voltaire.fr/) !

### B. Script Tampermonkey (Utilisateurs avancés)

Cette méthode nécessite l'installation préalable d'un gestionnaire de scripts comme Tampermonkey.

1.  **Installez Tampermonkey :**
    * Si ce n'est pas déjà fait, installez [Tampermonkey](https://www.tampermonkey.net/) (recommandé) ou une extension similaire pour votre navigateur.
2.  **Installez le script utilisateur :**
    * Naviguez vers le dossier `Tampermonkey/` de ce dépôt.
    * Choisissez le fichier `.user.js` que vous souhaitez utiliser (par exemple, `version_gemini-2.5-flash-preview-04-17_thinking.user.js`).
    * Cliquez sur le nom du fichier, puis sur le bouton "Raw" (ou "Brut").
    * Tampermonkey devrait détecter le script et vous proposer de l'installer. Cliquez sur "Installer".
3.  **Configurez la clé API dans le script :**
    * Ouvrez le tableau de bord de Tampermonkey.
    * Trouvez le script "Projet Voltaire Assistant" que vous venez d'installer et cliquez sur l'icône d'édition.
    * Localisez la ligne (au début du script) :
        ```javascript
        const GEMINI_API_KEY = 'VOTRE_CLE_API_GEMINI_ICI';
        ```
    * Remplacez `'VOTRE_CLE_API_GEMINI_ICI'` par votre propre clé API Gemini.
    * Enregistrez les modifications (Ctrl+S ou via le menu Fichier > Enregistrer).

Le script Tampermonkey est maintenant prêt. Notez que les règles mémorisées et autres configurations (comme les budgets de réflexion) ne seront pas persistantes entre les sessions de la même manière qu'avec la version Extension, à moins que le script spécifique n'implémente sa propre logique de sauvegarde avec `GM_setValue/GM_getValue`.

---

## 3. Utilisation de l'Assistant

Une fois installé et configuré :

1.  Naviguez vers le site [Projet Voltaire](https://www.projet-voltaire.fr/) et connectez-vous.
2.  Accédez à un module d'entraînement.
3.  Lorsque l'assistant détecte un exercice compatible :
    * Des boutons d'action (ex: "Analyser Phrase (Gemini)", "Analyser QCM (Gemini)", "Voir Règles") apparaîtront sur la page (généralement en haut à droite).
    * Une boîte d'indication en bas à droite vous donnera des informations sur l'état de l'analyse et les suggestions de l'IA.
4.  Cliquez sur les boutons pour interagir avec l'assistant.

Si vous rencontrez des problèmes, vérifiez que votre clé API est correctement configurée et que l'extension/script est activé.