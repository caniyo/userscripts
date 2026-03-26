// ==UserScript==
// @name         Twitch Error 3000 Auto-Reload
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically reload Twitch player when Error 3000 appears
// @author       caniyo
// @match        https://twitch.tv/*
// @match        https://www.twitch.tv/*
// @icon         https://www.twitch.tv/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Check for Error 3000 periodically
    const checkForError = setInterval(() => {
        // Look for error message in the player or overlay
        const errorText = document.body.innerText;
        
        if (errorText.includes('Error 3000') || errorText.includes('3000')) {
            console.log('[Twitch Error 3000] Detected! Reloading player...');
            clearInterval(checkForError);
            
            // Give it a moment, then reload
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }, 2000);

    // Also watch for the error via mutation observer (more reliable)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const errorDiv = document.querySelector('[data-a-player-state], .video-player, [class*="error"]');
                
                if (errorDiv && errorDiv.innerText && errorDiv.innerText.includes('3000')) {
                    console.log('[Twitch Error 3000] Detected via observer! Reloading...');
                    clearInterval(checkForError);
                    observer.disconnect();
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            }
        });
    });

    // Start observing the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(checkForError);
        observer.disconnect();
    });
})();
