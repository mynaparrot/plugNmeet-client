let isShowingPagination = false,
  totalRecordings = 0,
  currentPage = 1,
  limitPerPage = 10,
  showPre = false,
  showNext = true;

window.addEventListener('load', async () => {
  if (IS_ADMIN) {
    isSessionActive();
    setInterval(() => {
      isSessionActive();
    }, 1000 * 60 * 5);
  }

  // initial call
  fetchRecordings();

  document.querySelector('.join').addEventListener('click', (e) => {
    e.preventDefault();
    joinSession();
  });

  document.querySelector('.end').addEventListener('click', (e) => {
    e.preventDefault();
    if (IS_ADMIN) {
      endSession();
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.id === 'backward') {
      e.preventDefault();
      if (!showPre) {
        return;
      }
      currentPage--;
      paginate(currentPage);
    } else if (e.target.id === 'forward') {
      e.preventDefault();
      if (!showNext) {
        return;
      }
      currentPage++;
      paginate(currentPage);
    }
  });
});

async function joinSession() {
  const res = await sendAPIRequest('/room/join', {});
  if (res.status) {
    const url = window.PLUG_N_MEET_SERVER_URL + '/?access_token=' + res.token;
    window.open(url, '_blank');

    if (IS_ADMIN) {
      document.querySelector('.end').style.display = '';
    }
  } else {
    alert(res.msg);
  }
}

async function endSession() {
  const res = await sendAPIRequest('/room/end', {});
  if (res.status) {
    document.querySelector('.end').style.display = 'none';
  } else {
    alert(res.msg);
  }
}

async function isSessionActive() {
  const res = await sendAPIRequest('/room/isActive', {});
  const btn = document.querySelector('.end');
  if (res.status) {
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

async function fetchRecordings(from = 0, limit = 10, order_by = 'DESC') {
  const res = await sendAPIRequest('/recording/fetch', {
    from,
    limit,
    order_by,
  });

  if (res.status) {
    if (!res.result.total_recordings) {
      showMessage('no recordings');
      return;
    }
    const recordings = res.result.recordings_list;
    if (
      res.result.total_recordings > recordings.length &&
      !isShowingPagination
    ) {
      totalRecordings = res.result.total_recordings;
      showPagination();
      isShowingPagination = true;
    }
    displayRecordings(recordings);
  } else {
    showMessage(res.msg);
  }
}

async function downloadRecording(e) {
  e.preventDefault();
  const recordId = e.target.attributes.getNamedItem('data-recording').value;

  const res = await sendAPIRequest('/recording/download', {
    record_id: recordId,
  });

  if (res.status) {
    const url =
      window.PLUG_N_MEET_SERVER_URL + '/download/recording/' + res.token;
    window.open(url, '_blank');
  } else {
    alert(res.msg);
  }
}

async function deleteRecording(e) {
  e.preventDefault();

  if (confirm('Are you sure to delete?') !== true) {
    return;
  }

  const recordId = e.target.attributes.getNamedItem('data-recording').value;
  const res = await sendAPIRequest('/recording/delete', {
    record_id: recordId,
  });

  if (res.status) {
    document.getElementById(recordId).remove();
  } else {
    alert(res.msg);
  }
}

async function sendAPIRequest(path, body) {
  const url = window.PLUG_N_MEET_SERVER_URL + '/lti/v1/api' + path;
  const output = {
    status: false,
    msg: '',
  };
  try {
    const res = await axios.post(url, JSON.stringify(body), {
      headers: {
        Authorization: TOKEN,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (e) {
    output.msg = e.message;
  }

  return output;
}

function displayRecordings(recordings) {
  let html = '';
  for (let i = 0; i < recordings.length; i++) {
    const recording = recordings[i];
    html += '<div class="table-item" id="' + recording.record_id + '">';
    html +=
      '<div class="recording-date">' +
      new Date(recording.creation_time * 1e3).toLocaleString() +
      '</div>';
    html +=
      '<div class="meeting-date">' +
      new Date(recording.room_creation_time * 1e3).toLocaleString() +
      '</div>';
    html += '<div class="file-size">' + recording.file_size + '</div>';

    html += '<div class="action">';
    html +=
      '<a href="#" class="download" data-recording="' +
      recording.record_id +
      '" onclick="downloadRecording(event)">Download</a>';
    if (IS_ADMIN) {
      html +=
        '<a href="#" class="delete" data-recording="' +
        recording.record_id +
        '" onclick="deleteRecording(event)">Delete</a>';
    }
    html += '</div>';

    html += '</div>';
  }

  document.getElementById('recordingListsBody').innerHTML = html;
}

function showPagination() {
  currentPage = 1;
  document.querySelector('.pagination').style.display = '';
  paginate(currentPage);
}

function paginate(currentPage) {
  document.getElementById('recordingListsBody').innerHTML = '';
  const from = (currentPage - 1) * limitPerPage;

  if (currentPage === 1) {
    showPre = false;
    document.getElementById('backward').setAttribute('disabled', 'disabled');
  } else {
    showPre = true;
    document.getElementById('backward').removeAttribute('disabled');
  }

  if (currentPage >= totalRecordings / limitPerPage) {
    showNext = false;
    document.getElementById('forward').setAttribute('disabled', 'disabled');
  } else {
    showNext = true;
    document.getElementById('forward').removeAttribute('disabled');
  }

  fetchRecordings(from, limitPerPage);
}

function showMessage(msg) {
  document.getElementById('recordingListsBody').innerHTML = msg;
}
