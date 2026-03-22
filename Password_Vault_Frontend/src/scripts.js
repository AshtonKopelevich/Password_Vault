function saveData(user, pass) {
    const entries = JSON.parse(localStorage.getItem('entries') ||  "[]" );
    entries.push({user, pass, timestamp: Date.now()});
    localStorage.setItem('entries', JSON.stringify(entries));
}

function storeData() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    saveData(username, password);

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}


