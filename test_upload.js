(async () => {
    try {
        const response = await fetch('https://p2fk.io/Upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: "data" })
        });
        console.log(response.status, response.statusText);
        const text = await response.text();
        console.log("Upload response:", text);
    } catch (e) {
        console.error("Upload failed:", e);
    }
})();
