const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

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

document.addEventListener('DOMContentLoaded', () => {
    const staffId = getStaffIdFromToken();
    //console.log("User ID from token:", staffId);
    //console.log("Emitting get-my-reviews-by-id with userId:", staffId);
    socket.emit('get-my-reviews-by-id', { staffId });
});

socket.on('my-reviews-id', (reviews) => {
    //console.log("Received reviews:", reviews);
    renderReview(reviews);
});

function renderReview(reviews) {
    const list = document.getElementById('reviewsList');
    list.innerHTML = ''; // Clear existing content

    if (!reviews.length) {
        list.innerHTML = '<li>No reviews found.</li>';
        return;
    }

    reviews.forEach(review => {
        const reviewItem = document.createElement('li');
        reviewItem.className = 'review-item';
        reviewItem.id = `review-${review.id}`;

        const hasResponded = !!review.staffResponse;

        reviewItem.innerHTML = `
            <p><strong>Service:</strong> ${review.Appointment?.service?.name || 'N/A'}</p>
            <p><strong>Rating:</strong> ${review.rating}</p>
            <p><strong>Comment:</strong> ${review.comment}</p>
            <p><strong> Your Response:</strong> ${review.staffResponse || '<span class="no-response">No response yet</span>'}</p>
            <div class="response-section" style="${hasResponded ? 'display: none;' : 'display: block;'}">
                
                <textarea id="response-text-${review.id}" placeholder="Write a response...">${review.staffResponse || ''}</textarea>
                <button onclick="submitResponse(${review.id})">Respond</button>
            </div>
        `;

        list.appendChild(reviewItem);
    });
}




function submitResponse(reviewId) {
    console.log("Reviewid", reviewId);
    const textArea = document.getElementById(`response-text-${reviewId}`);
    const responseText = textArea.value.trim();
    console.log("Text is:", responseText);
    if (!responseText) return alert("Please enter a response.");

    socket.emit('respond-review', {
        reviewId,
        staffResponse: responseText
    });

    textArea.value = ''; // Clear the textarea after submission

}

socket.on('review-response-saved', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    const textArea = document.getElementById(`response-text-${review.id}`);

    if (reviewEl && textArea) {
        // Update the response section
        const responseSection = reviewEl.querySelector('.response-section p');
        if (responseSection) {
            responseSection.innerHTML = `<strong>Staff Response:</strong> ${review.staffResponse}`;
        }

        // 🚫 Hide the response section div after responding
        const responseDiv = reviewEl.querySelector('.response-section');
        if (responseDiv) responseDiv.style.display = 'none';
    }
});


socket.on('review-response', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    if (reviewEl) {
        const responseEl = reviewEl.querySelector('.response');
        responseEl.innerHTML = `<b>Staff response:</b> ${review.response}`;
    }
});
