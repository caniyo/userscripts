// ==UserScript==
// @name         AO3: dict.cc Quick Lookup
// @namespace    https://archiveofourown.org/
// @version      2.0
// @description  Double-click text to open dict.cc instantly on AO3
// @author       caniyo
// @icon         https://archiveofourown.org/favicon.ico
// @match        *://*.archiveofourown.org/works/*
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('dblclick', function(e) {
        const text = window.getSelection().toString().trim();
        
        if (text && text.length > 0 && text.length < 100) {
            window.open(`https://www.dict.cc/?s=${encodeURIComponent(text)}`, '_blank');
        }
    });
})();
