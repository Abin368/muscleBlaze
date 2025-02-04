function handleFormSubmit(event) {
    event.preventDefault();

  
    const search = new URLSearchParams(window.location.search).get('search') || "";

  
    const name = document.getElementsByName("name")[0].value;
    const description = document.getElementById("descriptionId").value;

 
    fetch(`/admin/addCategory?search=${search}`, { 
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({ name, description })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage('error', data.message);
        } else {
            showMessage('success', data.message);
        }
    })
    .catch(error => {
        showMessage('error', 'An error occurred while adding the category');
    });
}




function showMessage(type, message) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    if (type === 'success') {
        messageElement.style.color = 'green';
    } else {
        messageElement.style.color = 'red';
    }
    messageElement.style.display = 'block';
}


function validateForm() {
    clearErrorMessages();
    const name = document.getElementsByName('name')[0].value.trim();
    const description = document.getElementById("descriptionId").value.trim();
    let isValid = true;

    if (name === "") {
        displayErrorMessage("name-error", "Please enter a name");
        isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
        displayErrorMessage("name-error", "Category name should contain only alphabetic characters and spaces");
        isValid = false;
    }

    if (description === "") {
        displayErrorMessage("description-error", "Please enter a description");
        isValid = false;
    }
    return isValid;
}

function displayErrorMessage(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.innerText = message;
    errorElement.style.display = "block";
}

function clearErrorMessages() {
    const errorElements = document.getElementsByClassName('error-message');
    Array.from(errorElements).forEach((element) => {
        element.innerText = "";
        element.style.display = "none";
    });
}