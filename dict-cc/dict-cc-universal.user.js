// ==UserScript==
// @name         dict.cc Quick Lookup (Universal)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Double-click text to open dict.cc instantly on any website
// @author       caniyo
// @icon         https://www.dict.cc/favicon.ico
// @match        *://*/*
// @exclude      *://*.archiveofourown.org/*
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
