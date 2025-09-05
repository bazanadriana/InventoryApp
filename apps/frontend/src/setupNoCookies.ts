// Force all fetch() calls to avoid cookies.
(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const nextInit: RequestInit = { ...init, credentials: "omit" };
      return origFetch(input, nextInit);
    };
  })();
  