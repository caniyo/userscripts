// ==UserScript==
// @name         YouTube Link Enhancer
// @namespace    https://violentmonkey.github.io/
// @version      3.0
// @description  Shows YouTube video titles with hover preview - vibe coded with Claude for private use
// @author       caniyo
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const YT_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23FF0000' d='M43.2 33.9c-.4 2.1-2.1 3.7-4.2 4-.3.1-8.6 1.1-15 1.1-6.5 0-14.6-.9-15-1.1-2.1-.3-3.8-1.9-4.2-4C4.4 31.6 4 28.2 4 24c0-4.2.4-7.6.8-9.9.4-2.1 2.1-3.7 4.2-4 .3-.1 8.6-1.1 15-1.1s14.7.9 15 1.1c2.1.3 3.8 1.9 4.2 4 .4 2.3.9 5.7.9 9.9-.1 4.2-.5 7.6-.9 9.9zM20.5 31.6l11-6.5-11-6.5v13z'/%3E%3C/svg%3E";
    const OEMBED_URL = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=";
    const THUMB_URL = "https://i.ytimg.com/vi/";

    // Cache für Video-Metadaten
    const cache = new Map();
    
    // Set um bereits verarbeitete Links zu tracken
    const processed = new WeakSet();
    
    // Tooltip DOM-Element (wiederverwendet)
    let globalTooltip = null;

    /**
     * Prüft ob es ein einfacher YouTube Link ist (nur Text, keine verschachtelten Elemente)
     */
    function isPlainYouTubeLink(element) {
        // Skip wenn Element Kinder hat
        if (element.children.length > 0) return false;
        
        const href = element.getAttribute("href") || "";
        const text = element.textContent.trim();
        
        // Link muss YouTube-Link sein und Text muss Link oder Teile davon sein
        return YT_REGEX.test(href) && (href === text || href.endsWith(text));
    }

    /**
     * Extrahiert Video-ID aus URL
     */
    function extractVideoId(url) {
        const match = url.match(YT_REGEX);
        return match ? match[1] : null;
    }

    /**
     * Gibt oder erstellt das globale Tooltip-Element
     */
    function getTooltip() {
        if (!globalTooltip) {
            globalTooltip = document.createElement("div");
            globalTooltip.style.cssText = `
                position: fixed;
                z-index: 2147483647;
                display: none;
                pointer-events: none;
                transition: opacity 0.15s ease;
                opacity: 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                max-width: 320px;
            `;
            document.body.appendChild(globalTooltip);
        }
        return globalTooltip;
    }

    /**
     * Positioniert das Tooltip intelligent
     */
    function positionTooltip(event, tooltip) {
        const padding = 15;
        let x = event.clientX + padding;
        let y = event.clientY + padding;

        // Rect nach positionierung prüfen
        const rect = tooltip.getBoundingClientRect();
        
        // Zu weit rechts?
        if (x + rect.width > window.innerWidth) {
            x = window.innerWidth - rect.width - padding;
        }
        
        // Zu weit unten?
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - padding;
        }

        // Mindestabstand von Ecken
        x = Math.max(padding, x);
        y = Math.max(padding, y);

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    /**
     * Zeigt das Tooltip mit Thumbnail
     */
    function showTooltip(event, videoId) {
        const tooltip = getTooltip();
        tooltip.innerHTML = `<img src="${THUMB_URL}${videoId}/hqdefault.jpg" alt="" style="display:block;width:100%;margin:0;padding:0;border:none;">`;
        tooltip.style.display = "block";
        
        requestAnimationFrame(() => {
            positionTooltip(event, tooltip);
            tooltip.style.opacity = "1";
        });
    }

    /**
     * Versteckt das Tooltip
     */
    function hideTooltip() {
        const tooltip = getTooltip();
        tooltip.style.opacity = "0";
        setTimeout(() => {
            tooltip.style.display = "none";
        }, 150);
    }

    /**
     * Styled den Link neu
     */
    function styleLink(element) {
        element.style.fontWeight = "bold";
        element.style.color = "inherit";
        element.style.cursor = "pointer";
    }

    /**
     * Erstellt das Icon für YouTube
     */
    function createIcon() {
        const icon = document.createElement("img");
        icon.src = YT_FAVICON;
        icon.alt = "";
        icon.style.cssText = `
            height: 1em;
            width: auto;
            vertical-align: text-bottom;
            margin-right: 4px;
            display: inline-block;
        `;
        return icon;
    }

    /**
     * Fetcht Video-Metadaten von YouTube
     */
    function fetchVideoData(videoId) {
        return new Promise((resolve, reject) => {
            // Bereits gecacht?
            if (cache.has(videoId)) {
                resolve(cache.get(videoId));
                return;
            }

            GM_xmlhttpRequest({
                method: "GET",
                url: `${OEMBED_URL}${videoId}&format=json`,
                timeout: 8000,
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        cache.set(videoId, data);
                        resolve(data);
                    } catch (e) {
                        console.error("YouTube Link Enhancer: Parse error", e);
                        reject(e);
                    }
                },
                onerror: (err) => {
                    console.error("YouTube Link Enhancer: Request error", err);
                    reject(err);
                },
                ontimeout: () => {
                    console.error("YouTube Link Enhancer: Request timeout");
                    reject(new Error("Timeout"));
                }
            });
        });
    }

    /**
     * Enhanced einen Link mit Titel und Hover-Preview
     */
    function enhanceLink(element) {
        // Bereits verarbeitet?
        if (processed.has(element)) return;
        processed.add(element);

        const videoId = extractVideoId(element.href);
        if (!videoId) return;

        // Flag setzen (für debuggen)
        element.dataset.ytEnhanced = "true";
        element.dataset.videoId = videoId;

        // Styling
        styleLink(element);

        // Hover Events für Lazy Loading
        let isLoading = false;
        let hasLoaded = false;

        element.addEventListener("mouseenter", async (e) => {
            // Nur laden wenn noch nicht geladen
            if (!hasLoaded && !isLoading) {
                isLoading = true;
                try {
                    const data = await fetchVideoData(videoId);
                    hasLoaded = true;
                    
                    // Link inhalt updaten (nur beim ersten Hover)
                    if (!element.querySelector("img")) {
                        element.textContent = "";
                        element.appendChild(createIcon());
                        element.appendChild(document.createTextNode(data.title));
                    }
                } catch (err) {
                    // Fallback auf Original-Text bei Fehler
                    console.warn(`Failed to enhance link for video ${videoId}`, err);
                    isLoading = false;
                }
            }

            // Tooltip zeigen (Cache wird genutzt)
            if (hasLoaded) {
                showTooltip(e, videoId);
            }
        });

        element.addEventListener("mousemove", (e) => {
            if (hasLoaded) {
                positionTooltip(e, getTooltip());
            }
        });

        element.addEventListener("mouseleave", () => {
            hideTooltip();
        });
    }

    /**
     * Scannt Seite nach YouTube-Links
     */
    function scanForLinks() {
        document.querySelectorAll("a[href]").forEach(link => {
            if (isPlainYouTubeLink(link)) {
                enhanceLink(link);
            }
        });
    }

    /**
     * Debounced MutationObserver für Performance
     */
    let scanTimeout;
    const observer = new MutationObserver(() => {
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(scanForLinks, 300);
    });

    // Starten
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial scan
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scanForLinks);
    } else {
        scanForLinks();
    }

    // Fallback scan nach Seiten-Load
    window.addEventListener("load", scanForLinks);

})();
