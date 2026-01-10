// SSR Polyfills for server-side rendering
// This file provides polyfills for browser-only globals when running on the server

// Comprehensive polyfills for all browser globals
if (typeof global !== 'undefined') {
    // Server-side environment - Define all browser globals

    // Core browser globals
    if (typeof global.self === 'undefined') {
        (global as any).self = global
    }

    if (typeof global.window === 'undefined') {
        (global as any).window = global
    }

    if (typeof global.document === 'undefined') {
        global.document = {
            createElement: () => ({
                setAttribute: () => { },
                getAttribute: () => null,
                removeAttribute: () => { },
                appendChild: () => { },
                removeChild: () => { },
                addEventListener: () => { },
                removeEventListener: () => { },
                style: {},
                className: '',
                id: '',
                tagName: 'DIV',
                nodeType: 1,
                parentNode: null,
                childNodes: [],
                firstChild: null,
                lastChild: null,
                nextSibling: null,
                previousSibling: null,
            }),
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => { },
            removeEventListener: () => { },
            body: {},
            head: {},
            title: '',
            cookie: '',
            domain: '',
            URL: '',
            defaultView: global,
        } as any
    }

    if (typeof global.navigator === 'undefined') {
        global.navigator = {
            userAgent: 'Node.js',
            platform: 'Node.js',
            language: 'en-US',
            languages: ['en-US'],
            onLine: true,
            cookieEnabled: false,
            doNotTrack: '1',
        } as any
    }

    if (typeof global.location === 'undefined') {
        global.location = {
            href: '',
            origin: '',
            protocol: 'https:',
            host: '',
            hostname: '',
            port: '',
            pathname: '/',
            search: '',
            hash: '',
            assign: () => { },
            replace: () => { },
            reload: () => { },
        } as any
    }

    if (typeof global.history === 'undefined') {
        global.history = {
            pushState: () => { },
            replaceState: () => { },
            go: () => { },
            back: () => { },
            forward: () => { },
            length: 1,
            state: null,
        } as any
    }

    if (typeof global.localStorage === 'undefined') {
        global.localStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { },
            length: 0,
            key: () => null,
        } as any
    }

    if (typeof global.sessionStorage === 'undefined') {
        global.sessionStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { },
            length: 0,
            key: () => null,
        } as any
    }

    // Additional browser globals
    if (typeof global.screen === 'undefined') {
        global.screen = {
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040,
            colorDepth: 24,
            pixelDepth: 24,
        } as any
    }

    if (typeof global.performance === 'undefined') {
        global.performance = {
            now: () => Date.now(),
            mark: () => { },
            measure: () => { },
            getEntries: () => [],
            getEntriesByType: () => [],
            getEntriesByName: () => [],
        } as any
    }

    if (typeof global.requestAnimationFrame === 'undefined') {
        global.requestAnimationFrame = () => 1
        global.cancelAnimationFrame = () => { }
    }

    if (typeof global.setTimeout === 'undefined') {
        global.setTimeout = setTimeout
        global.clearTimeout = clearTimeout
        global.setInterval = setInterval
        global.clearInterval = clearInterval
    }

    // Event handling
    if (typeof global.addEventListener === 'undefined') {
        global.addEventListener = () => { }
        global.removeEventListener = () => { }
        global.dispatchEvent = () => true
    }

    // Console (ensure it exists)
    if (typeof global.console === 'undefined') {
        global.console = console
    }
}