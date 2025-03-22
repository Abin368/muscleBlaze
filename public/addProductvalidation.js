document.getElementById("productForm").addEventListener("submit", async function(event) {
    event.preventDefault(); 

    const formData = new FormData(this);

    try {
        const response = await fetch("/admin/addProducts", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        const messageContainer = document.getElementById("messageContainer");

        if (result.error) {
            messageContainer.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        } else {
            messageContainer.innerHTML = `<div class="alert alert-success">${result.success}</div>`;
            this.reset();
        }
    } catch (error) {
        console.error("Error submitting form:", error);
    }
});