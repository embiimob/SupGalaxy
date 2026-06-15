(async () => {
    try {
        const formData = new FormData();
        const blob = new Blob([JSON.stringify({ test: "data" })], { type: 'application/json' });
        formData.append('file', blob, 'test.json');
        const response = await fetch('https://p2fk.io/ipfs', {
            method: 'POST',
            body: formData
        });
        console.log(response.status, response.statusText);
        const text = await response.text();
        console.log("Upload response:", text);
    } catch (e) {
        console.error("Upload failed:", e);
    }
})();
