const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the .vscode directory where index.html is located
app.use(express.static(path.join(__dirname, '.vscode')));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '.vscode', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
