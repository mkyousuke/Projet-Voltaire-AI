function showStatus(message, type = 'success') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.color = type === 'success' ? 'green' : 'red';
    setTimeout(function() {
        status.textContent = '';
    }, 2500);
}

function saveOptions() {
    const apiKey = document.getElementById('apiKey').value;
    const maxCorrections = parseInt(document.getElementById('maxCorrections').value, 10);
    const budgetNormal = parseInt(document.getElementById('thinkingBudgetNormal').value, 10);
    const budgetEnhanced = parseInt(document.getElementById('thinkingBudgetEnhanced').value, 10);
    const budgetQCM = parseInt(document.getElementById('thinkingBudgetQCM').value, 10);

    if (isNaN(maxCorrections) || maxCorrections < 0 || maxCorrections > 50) {
        showStatus("Erreur : 'Nombre maximum de règles' doit être entre 0 et 50.", "error");
        return;
    }
    if (isNaN(budgetNormal) || budgetNormal < 0 || isNaN(budgetEnhanced) || budgetEnhanced < 0 || isNaN(budgetQCM) || budgetQCM < 0) {
        showStatus("Erreur : Les budgets de réflexion ne peuvent pas être négatifs.", "error");
        return;
    }
    if (!apiKey) {
        showStatus("Attention : La clé API est vide. L'extension ne fonctionnera pas.", "error");
    }

    chrome.storage.local.set({
        geminiApiKey: apiKey,
        maxCorrections: maxCorrections,
        thinkingBudgetNormal: budgetNormal,
        thinkingBudgetEnhanced: budgetEnhanced,
        thinkingBudgetQCM: budgetQCM
    }, function() {
        if (chrome.runtime.lastError) {
            showStatus(`Erreur lors de l'enregistrement : ${chrome.runtime.lastError.message}`, "error");
        } else {
            showStatus('Options enregistrées avec succès !');
        }
    });
}

function restoreOptions() {
    chrome.storage.local.get({
        geminiApiKey: '',
        maxCorrections: 10,
        thinkingBudgetNormal: 512,
        thinkingBudgetEnhanced: 1536,
        thinkingBudgetQCM: 1024
    }, function(items) {
        if (chrome.runtime.lastError) {
            showStatus(`Erreur lors de la récupération des options : ${chrome.runtime.lastError.message}`, "error");
            return;
        }
        document.getElementById('apiKey').value = items.geminiApiKey;
        document.getElementById('maxCorrections').value = items.maxCorrections;
        document.getElementById('thinkingBudgetNormal').value = items.thinkingBudgetNormal;
        document.getElementById('thinkingBudgetEnhanced').value = items.thinkingBudgetEnhanced;
        document.getElementById('thinkingBudgetQCM').value = items.thinkingBudgetQCM;
    });
}

function clearMemorizedRules() {
    chrome.storage.local.set({ memoireDesCorrections: [] }, function() {
        if (chrome.runtime.lastError) {
            showStatus(`Erreur lors de l'effacement des règles : ${chrome.runtime.lastError.message}`, "error");
        } else {
            showStatus('Règles mémorisées effacées !');
        }
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('clearRules').addEventListener('click', clearMemorizedRules);