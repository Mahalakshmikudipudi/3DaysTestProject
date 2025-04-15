const socket = io('http://localhost:3000', {
    auth: { token: localStorage.getItem('token') }
});

document.addEventListener('DOMContentLoaded', () => {
    socket.emit('get-eligible-appointments');
    socket.emit('get-my-reviews');
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
    socket.emit('get-my-reviews');
});

socket.on('my-reviews', (reviews) => {
    displayReviews(reviews);
});

async function displayReviews(reviews) {
    const list = document.getElementById('myReviews');
    if (reviews.length === 0) {
        list.innerHTML = '<li>No reviews submitted yet.</li>';
        return;
    }
    list.innerHTML = '';
    reviews.forEach(r => {
        const item = document.createElement('li');
        item.innerHTML = `
          ${r.service?.name} by ${r.Staff?.staffname || ''} - Rating: ${r.rating} <br>
          Comment: ${r.comment} <br>
          ${r.staffResponse ? `<b>${r.Staff.staffname} response:</b> ${r.staffResponse}` : '<i>No response yet</i>'}
        `;
        list.appendChild(item);
    });
};

