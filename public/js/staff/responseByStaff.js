const API = `http://localhost:3000`;
const token = localStorage.getItem("token");

function getStaffIdFromToken() {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.staffId;
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const reviewsPerPage = localStorage.getItem("reviewsPerPage") || 5; // Default to 5
    document.getElementById("itemsPerPage").value = reviewsPerPage; // Set dropdown value
    await fetchMyReviews(1, reviewsPerPage);
});
  
  // Event listener for dropdown to update preference
document.getElementById("itemsPerPage").addEventListener("change", async function () {
    const selectedLimit = this.value;
    localStorage.setItem("reviewsPerPage", selectedLimit); // Store user preference
    await fetchMyReviews(1, selectedLimit); // Fetch data with new limit
});

async function fetchMyReviews(page, limit) {
    const staffId = getStaffIdFromToken();
    if (!staffId) return;

    try {
        const response = await fetch(`${API}/staff/get-reviews/${staffId}?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        
        if (!response.ok) throw new Error('Failed to fetch reviews.');

        const data = await response.json();
        currentReviews = data.reviews || [];
        currentReviews.forEach(review => {
            displayReviews(review);
        });
        showPagination(data);
    } catch (error) {
        console.error('Error fetching reviews:', error);
    }
}

function displayReviews(review) {
    const list = document.getElementById('reviewsList');
        const item = document.createElement('li');
        item.className = 'review-item';
        item.id = `review-${review.id}`;

        let responseHtml = '';

        if (review.Response) {
            responseHtml = `<p><strong>Response:</strong> ${review.Response}</p>`;
        } else {
            responseHtml = `
                <p><strong>Response:</strong> <span class="no-response">No response yet</span></p>
                <div class="response-section">
                    <textarea id="response-text-${review.id}" placeholder="Write a response..."></textarea>
                    <button onclick="submitResponse(${review.id})">Respond</button>
                </div>
            `;
        }

        item.innerHTML = `
            <p><strong>Service:</strong> ${review.Appointment?.Service?.name || review.Service?.name || 'N/A'}</p>
            <p><strong>Rating:</strong> ${review.rating}</p>
            <p><strong>Comment:</strong> ${review.comment}</p>
            ${responseHtml}<br><hr>
        `;

        list.appendChild(item);

}

async function submitResponse(reviewId) {
    const review = currentReviews.find(r => r.id === reviewId);
    if (!review) return alert("Review not found.");
    if (review.Response) return alert("Admin has already responded to this review.");

    const textArea = document.getElementById(`response-text-${reviewId}`);
    const responseText = textArea.value.trim();
    if (!responseText) return alert("Please enter a response.");

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API}/staff/respond-to-review`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reviewId,
                staffResponse: responseText
            })
        });

        if (!response.ok) throw new Error('Failed to save response.');

        const updatedReview = await response.json();

        // Update local data
        const reviewIndex = currentReviews.findIndex(r => r.id === updatedReview.id);
        if (reviewIndex !== -1) {
            currentReviews[reviewIndex] = updatedReview;
        }

        // Refresh UI
        currentReviews.forEach(review => {
            displayReviews(review);
        })

        //Re-fetch updated expenses list (optional but recommended)
        const reviewsPerPage = localStorage.getItem("reviewsPerPage") || 5;
        await fetchMyReviews(1, reviewsPerPage);
    } catch (error) {
        console.error('Error responding to review:', error);
        alert('Failed to submit response.');
    }
};

// Update pagination buttons
async function showPagination({ currentPage, hasNextPage, nextPage, hasPreviousPage, previousPage, lastPage }) {
    try {
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = '';

        const limit = localStorage.getItem("reviewsPerPage") || 5; // Get stored limit

        if (hasPreviousPage) {
            const btnPrev = document.createElement('button');
            btnPrev.innerHTML = previousPage;
            btnPrev.addEventListener('click', () => fetchMyReviews(previousPage, limit));
            pagination.appendChild(btnPrev);
        }

        const btnCurrent = document.createElement('button');
        btnCurrent.innerHTML = `<h3>${currentPage}</h3>`;
        btnCurrent.addEventListener('click', () => fetchMyReviews(currentPage, limit));
        pagination.appendChild(btnCurrent);

        if (hasNextPage) {
            const btnNext = document.createElement('button');
            btnNext.innerHTML = nextPage;
            btnNext.addEventListener('click', () => fetchMyReviews(nextPage, limit));
            pagination.appendChild(btnNext);
        }
    } catch (err) {
        console.log(err);
    }
}
  
  

