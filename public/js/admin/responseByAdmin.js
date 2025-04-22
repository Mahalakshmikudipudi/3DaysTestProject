const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});


document.addEventListener('DOMContentLoaded', () => {
    socket.emit('get-all-reviews');
});

let currentPage = 1;
const reviewsPerPage = 5;
let currentReviews = [];


socket.on('all-reviews', (data) => {
    const { reviews, total, page, totalPages } = data;
    console.log(reviews);
    currentReviews = reviews; 
    currentPage = page;       
    renderPaginatedReviews(); 
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

        // Case 1: Staff has responded — show staff response only
        if (review.staffResponse) {
            responseHtml = `<p><strong>Response:</strong> ${review.staffResponse}</p>`;
        } 
        // Case 2: Admin has responded — show admin response only
        else if (review.adminResponse) {
            responseHtml = `<p><strong>Response:</strong> ${review.adminResponse}</p>`;
        } 
        // Case 3: No one has responded — allow admin to respond
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
            ${responseHtml}<hr>
        `;

        list.appendChild(item);
    });

    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;
}





function submitResponse(reviewId) {
    const review = currentReviews.find(r => r.id === reviewId);
    if (!review) return alert("Review not found.");
    if (review.Response) return alert("Admin has already responded to this review.");

    console.log("Reviewid", reviewId);
    const textArea = document.getElementById(`response-text-${reviewId}`);
    const responseText = textArea.value.trim();
    console.log("Text is:", responseText);
    if (!responseText) return alert("Please enter a response.");

    socket.emit('respond-review-by-admin', {
        reviewId,
        adminResponse: responseText
    });

    textArea.value = ''; // Clear the textarea after submission

}

socket.on('review-response-saved-by-admin', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    const textArea = document.getElementById(`response-text-${review.id}`);

    if (reviewEl && textArea) {
        // Update the response section
        const responseSection = reviewEl.querySelector('.response-section p');
        if (responseSection) {
            responseSection.innerHTML = `<strong>Admin Response:</strong> ${review.Response}`;
        }

        //Hide the response section div after responding
        const responseDiv = reviewEl.querySelector('.response-section');
        if (responseDiv) responseDiv.style.display = 'none';
    }
});


socket.on('review-response-by-admin', (review) => {
    const reviewEl = document.getElementById(`review-${review.id}`);
    if (reviewEl) {
        const responseEl = reviewEl.querySelector('.response');
        responseEl.innerHTML = `<b>Staff response:</b> ${review.response}`;
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
  
  