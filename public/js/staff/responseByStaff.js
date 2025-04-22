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

let currentPage = 1;
const reviewsPerPage = 5;
let currentReviews = [];


socket.on('my-reviews-id', (data) => {
    const { reviews, total, page, totalPages } = data;

    currentReviews = reviews; // ✅ update global
    currentPage = page;       // ✅ sync current page
    renderPaginatedReviews(); // no args needed
});


function renderPaginatedReviews() {
    const start = (currentPage - 1) * reviewsPerPage;
    const end = start + reviewsPerPage;
    const reviewsToShow = currentReviews.slice(start, end);
    
    const list = document.getElementById('reviewsList');
    list.innerHTML = '';

    if (reviewsToShow.length === 0) {
        list.innerHTML = '<li>No reviews to display.</li>';
        return;
    }

    reviewsToShow.forEach(review => {
        const item = document.createElement('li');
        item.className = 'review-item';
        item.id = `review-${review.id}`;

        let responseHtml = '';

        //  Staff has responded — show staff response only
        if (review.Response) {
            responseHtml = `<p><strong>Response:</strong> ${review.Response}</p>`;
        } 
        //  No one has responded — staff can respond
        else {
            responseHtml = `
                <p><strong>Response:</strong> <span class="no-response">No response yet</span></p>
                <div class="response-section">
                    <textarea id="response-text-${review.id}" placeholder="Write a response..."></textarea>
                    <button onclick="submitResponse(${review.id})">Respond</button>
                </div>
            `;
        }

        item.innerHTML = `
            <p><strong>Service:</strong> ${review.Appointment?.service?.name || review.service?.name || 'N/A'}</p>
            <p><strong>Rating:</strong> ${review.rating}</p>
            <p><strong>Comment:</strong> ${review.comment}</p>
            ${responseHtml}
        `;

        list.appendChild(item);
    });

    document.getElementById("pageIndicator").textContent = `Page ${currentPage}`;
}






function submitResponse(reviewId) {
    const review = currentReviews.find(r => r.id === reviewId);
    if (!review) return alert("Review not found.");
    if (review.Response) return alert("Admin has already responded to this review.");

    const textArea = document.getElementById(`response-text-${reviewId}`);
    const responseText = textArea.value.trim();
    if (!responseText) return alert("Please enter a response.");

    socket.emit('respond-review', {
        reviewId,
        staffResponse: responseText
    });

    textArea.value = '';
}


socket.on('review-response-saved', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    const textArea = document.getElementById(`response-text-${review.id}`);

    if (reviewEl && textArea) {
        // Update the response section
        const responseSection = reviewEl.querySelector('.response-section p');
        if (responseSection) {
            responseSection.innerHTML = `<strong>Staff Response:</strong> ${review.Response}`;
        }

        //Hide the response section div after responding
        const responseDiv = reviewEl.querySelector('.response-section');
        if (responseDiv) responseDiv.style.display = 'none';
    }
});


socket.on('review-response', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    if (reviewEl) {
        const responseEl = reviewEl.querySelector('.response');
        responseEl.innerHTML = `<b>Staff response:</b> ${review.Response}`;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Safe to use getElementById here
    document.getElementById("prevPage").addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPaginatedReviews();
      }
    });
  
    document.getElementById("nextPage").addEventListener("click", () => {
      const maxPages = Math.ceil(currentReviews.length / reviewsPerPage);
      if (currentPage < maxPages) {
        currentPage++;
        renderPaginatedReviews();
      }
    });
  });
  
  