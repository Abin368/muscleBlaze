let debounceTimer;

document.getElementById("searchInput").addEventListener("keyup", function () {
    clearTimeout(debounceTimer); // Clear previous timer if user types again

    // Set a new timer for debouncing
    debounceTimer = setTimeout(() => {
        let searchQuery = this.value.trim(); // Get user input

        if (searchQuery.length === 0) {
            document.getElementById("userList").innerHTML = ""; // Clear results when empty
            return;
        }

        // Make AJAX request for search
        fetch(`/admin/users/search?search=${searchQuery}`)
            .then(response => response.json())
            .then(data => {
                let userList = document.getElementById("userList");
                userList.innerHTML = ""; // Clear previous results

                // Display the results
                data.data.forEach(user => {
                    userList.innerHTML += `<p>${user.name} - ${user.email}</p>`;
                });
            })
            .catch(error => console.error("Error fetching data:", error));
    }, 500); // Adjust delay (500ms recommended)
});
