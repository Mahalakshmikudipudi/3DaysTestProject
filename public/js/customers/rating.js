
const API = 'http://localhost:3000';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', async () => {
    await fetchEligibleAppointments();
});

async function fetchEligibleAppointments() {
  try {
    const res = await axios.get(`${API}/customer/get-eligible-appointments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const appointments = res.data.appointments || [];

    const select = document.getElementById('appointments');
    select.innerHTML = ''; 

    appointments.forEach(appt => {
      const option = document.createElement('option');
      option.value = appt.id;
      option.textContent = `${appt.date} | ${appt.Service?.name} by ${appt.Staff?.staffname}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Error fetching eligible appointments', err);
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

// Fetch expenses with pagination
async function fetchMyReviews(page, limit) {
  try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/customer/get-my-reviews?page=${page}&limit=${limit}`, {
          headers: { "Authorization": `Bearer ${token}` }
      });

      if(response.data.success) {
        response.data.reviews.forEach(review => {
          displayReviews(review);
        })
      }
      showPagination(response.data);
  } catch (err) {
      console.log(err);
  }
}

async function submitReview(e) {
  e.preventDefault();
  const appointmentId = document.getElementById('appointments').value;
  const rating = document.getElementById('rating').value;
  const comment = document.getElementById('comment').value;

  if (!appointmentId || !rating || comment.length === 0) {
    return alert('Please fill all fields.');
  }

  try {
    const response = await axios.post(`${API}/customer/submit-review`, {
      appointmentId,
      rating,
      comment
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if(response.data.success) {
      alert("Review Submitted");
      displayReviews(response.data.review);
      await fetchEligibleAppointments();
    }
    document.getElementById('rating').value = '';
    document.getElementById('comment').value = '';
    //Re-fetch updated expenses list (optional but recommended)
    const reviewsPerPage = localStorage.getItem("reviewsPerPage") || 5;
    await fetchMyReviews(1, reviewsPerPage);
  } catch (err) {
    console.error('Error submitting review', err);
    alert('Failed to submit review.');
  }
}

function displayReviews(review) {
  const list = document.getElementById('myReviews');

  if (review.length === 0) {
    list.innerHTML = '<li>No reviews to display.</li>';
    return;
  }
    const item = document.createElement('li');
    item.className = 'review-item';
    item.id = `review-${review.id}`;

    item.innerHTML = `
            <p><strong>Service:</strong> ${review.Appointment?.Service?.name || review.Service?.name || 'N/A'}</p>
            <p><strong>Rating:</strong> ${review.rating}</p>
            <p><strong>Comment:</strong> ${review.comment}</p>
            ${review.Response ? `<p><strong>Response:</strong> ${review.Response}</p>` : ''}
        `;

    list.appendChild(item);

}

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

