# 🤖 Projet Voltaire Assistant (avec API Gemini) 💡

L'Assistant Projet Voltaire est un outil conçu pour vous aider dans vos exercices sur le site Projet Voltaire en s'appuyant sur l'intelligence artificielle Gemini de Google 🧠. Il peut identifier des fautes dans les phrases uniques et évaluer les phrases des QCM.

Ce projet est disponible sous deux formes :
* **🌟 Extension de Navigateur (Recommandé) :** Pour une installation facile, une meilleure intégration et la persistance des données (comme les règles mémorisées et votre clé API) entre les sessions. C'est la version maintenue en priorité.
* **📜 Script Tampermonkey (Utilisateur avancé, Fonctionne aussi avec la nouvelle interface) :** Pour ceux qui préfèrent utiliser un gestionnaire de scripts.

## ✨ Fonctionnalités Principales

* **✍️ Assistance pour les phrases uniques :**
    * Détection des exercices de type "cliquez sur la faute".
    * Analyse de la phrase par l'IA Gemini.
    * Surlignage de la faute potentielle ou indication d'absence de faute.
* **📋 Assistance pour les QCM (disponible dans certaines versions) :**
    * Analyse des questions à choix multiples basées sur une règle grammaticale.
    * Surlignage des réponses suggérées par l'IA.
* **🧠 Mémoire des Corrections :**
    * Apprend des corrections validées pour améliorer les futures suggestions (surtout dans la version Extension).
* **⚙️ Options de Configuration (via la page d'options de l'Extension) :**
    * Gestion de la clé API Gemini.
    * Personnalisation du nombre de règles mémorisées.
    * Ajustement des "budgets de réflexion" de l'IA pour différents types d'analyses.
* **🖥️ Interface Utilisateur :**
    * Boutons d'action intégrés à la page d'exercice.
    * Indications visuelles claires.

## 🛠️ Prérequis

* Un navigateur web moderne (Chrome, Firefox, Edge, etc.).
* Une **clé API Gemini** valide. Vous pouvez en obtenir une gratuitement depuis [Google AI Studio](https://aistudio.google.com/).

## 🚀 Installation et Configuration

Les instructions détaillées pour l'installation et la configuration de l'**Extension de Navigateur** et du **Script Tampermonkey** se trouvent dans le fichier :

➡️ **[CONFIGURATION.md](CONFIGURATION.md)**

Ce fichier vous guidera à travers :
* L'obtention de votre clé API Gemini.
* L'installation de l'extension de navigateur.
* L'installation du script via Tampermonkey (si vous choisissez cette méthode).
* La configuration des options de l'assistant.

## ⚠️ Avertissement / Clause de non-responsabilité

* Cet outil est fourni **"TEL QUEL"**, sans garantie. Utilisez-le à vos propres risques.
* Les suggestions de l'IA peuvent contenir des erreurs. Cet outil est une aide à l'apprentissage, pas une solution de triche.
* L'auteur n'est pas responsable des conséquences de votre utilisation de cet outil.
* Vous êtes responsable de votre clé API Gemini et des éventuels coûts associés (bien que l'usage typique devrait rester dans les limites gratuites de l'API Gemini Flash).
* L'objectif est d'aider à la compréhension, non de contourner l'apprentissage. 🎓

## ✍️ Auteurs

* mkyousuke
* Partenaire de code (Gemini Pro) 🤖