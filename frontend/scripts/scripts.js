//This function will store the information into the browsers cache to be sent to the backend. 
function saveData(user, pass) {
    const entries = JSON.parse(localStorage.getItem('entries') ||  "[]" );
    entries.push({user, pass, timestamp: Date.now()});
    localStorage.setItem('entries', JSON.stringify(entries));
}

//This function will take the data from the boxes and pass the info the savaData function
function storeData() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    saveData(username, password);

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}
