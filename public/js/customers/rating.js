const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

let currentPage = 1;
const reviewsPerPage = 5;
let currentReviews = [];


document.addEventListener('DOMContentLoaded', () => {
    socket.emit('get-eligible-appointments');
    let page = currentPage;
    let limit = reviewsPerPage;
    socket.emit('get-my-reviews', { page, limit });
});


socket.on('eligible-appointments', (appointments) => {
    const select = document.getElementById('appointments');
    appointments.forEach(appt => {
        const option = document.createElement('option');
        option.value = appt.id;
        option.textContent = `${appt.date} | ${appt.service?.name} by ${appt.Staff.staffname}`;
        select.appendChild(option);
    });
});

function submitReview() {
    const appointmentId = document.getElementById('appointments').value;
    const rating = document.getElementById('rating').value;
    const comment = document.getElementById('comment').value;

    if (!appointmentId || !rating || comment.length === 0) {
        return alert('Please fill all fields.');
    }

    socket.emit('submit-review', { appointmentId, rating, comment });
}

socket.on('review-submitted', (review) => {
    alert('Review submitted!');
    document.getElementById('rating').value = '';
    document.getElementById('comment').value = '';
    let page = currentPage;
    let limit = reviewsPerPage;
    socket.emit('get-my-reviews', { page, limit });
});

socket.on('my-reviews', (data) => {
  const { reviews, total, page, totalPages } = data;
    //console.log(reviews);
    currentReviews = reviews;
    //console.log(currentReviews);
    currentPage = page;
    renderPaginatedReviews(currentReviews, total, currentPage, totalPages);
});

function renderPaginatedReviews(currentReviews, total, currentPage, totalPages) {
    const start = (currentPage - 1) * reviewsPerPage;
  const end = start + reviewsPerPage;
  const reviewsToShow = currentReviews.slice(start, end);

  const list = document.getElementById('myReviews'); // or 'myReviews' for client
  list.innerHTML = '';

  if (reviewsToShow.length === 0) {
    list.innerHTML = '<li>No reviews to display.</li>';
    return;
  }

  reviewsToShow.forEach(review => {
    const item = document.createElement('li');
    item.className = 'review-item';
    item.id = `review-${review.id}`;

    item.innerHTML = `
      <p><strong>Service:</strong> ${review.Appointment?.service?.name || review.service?.name || 'N/A'}</p>
      <p><strong>Rating:</strong> ${review.rating}</p>
      <p><strong>Comment:</strong> ${review.comment}</p>
      
    `;

    list.appendChild(item);
  });

  document.getElementById("pageIndicator").textContent = `Page ${currentPage}`;

};

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
  

