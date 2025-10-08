let isShowingPagination = false,
  totalRecordings = 0,
  currentPage = 1,
  limitPerPage = 10,
  showPre = false,
  showNext = true;

window.addEventListener('load', async () => {
  if (IS_ADMIN) {
    isSessionActive();
    setInterval(
      () => {
        isSessionActive();
      },
      1000 * 60 * 5,
    );
  }

  // initial call
  fetchRecordings();
  // design customization
  designCustomization();

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

const joinSession = async () => {
  const res = await callLtiApi('/room/join', {});
  if (res.status) {
    let url = window.PLUG_N_MEET_SERVER_URL + '/?access_token=' + res.token;
    if (typeof window.DESIGN_CUSTOMIZATION !== 'undefined') {
      url +=
        '&custom_design=' + encodeURIComponent(window.DESIGN_CUSTOMIZATION);
    }
    window.open(url, '_blank');

    if (IS_ADMIN) {
      document.querySelector('.end').style.display = '';
    }
  } else {
    alert(res.msg);
  }
};

const endSession = async () => {
  const res = await callLtiApi('/room/end', {});
  if (res.status) {
    document.querySelector('.end').style.display = 'none';
  } else {
    alert(res.msg);
  }
};

const isSessionActive = async () => {
  const btn = document.querySelector('.end');
  const res = await callLtiApi('/room/isActive', {});

  if (res.is_active) {
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
};

const fetchRecordings = async (from = 0, limit = 10, order_by = 'DESC') => {
  const res = await callLtiApi('/recording/fetch', {
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
};

const downloadRecording = async (e) => {
  e.preventDefault();
  const recordId = e.target.attributes.getNamedItem('data-recording').value;

  const res = await callLtiApi('/recording/download', {
    record_id: recordId,
  });

  if (res.status) {
    const url =
      window.PLUG_N_MEET_SERVER_URL + '/download/recording/' + res.token;
    window.open(url, '_blank');
  } else {
    alert(res.msg);
  }
};

const deleteRecording = async (e) => {
  e.preventDefault();

  if (confirm('Are you sure to delete?') !== true) {
    return;
  }

  const recordId = e.target.attributes.getNamedItem('data-recording').value;
  const res = await callLtiApi('/recording/delete', {
    record_id: recordId,
  });

  if (res.status) {
    document.getElementById(recordId).remove();
  } else {
    alert(res.msg);
  }
};

const callLtiApi = async (path, body) => {
  const url = window.PLUG_N_MEET_SERVER_URL + '/lti/v1/api' + path;
  const output = {
    status: false,
    msg: '',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(res.status, res.statusText);
    output.msg = res.statusText;
    return output;
  }

  try {
    return await res.json();
  } catch (e) {
    console.error(e);
    output.msg = e;
  }

  return output;
};

const displayRecordings = (recordings) => {
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
};

const showPagination = () => {
  currentPage = 1;
  document.querySelector('.pagination').style.display = '';
  paginate(currentPage);
};

const paginate = (currentPage) => {
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
};

const showMessage = (msg) => {
  document.getElementById('recordingListsBody').innerHTML = msg;
};

const designCustomization = () => {
  if (typeof window.DESIGN_CUSTOMIZATION === 'undefined') {
    return;
  }

  let designCustomParams = {};
  try {
    designCustomParams = JSON.parse(window.DESIGN_CUSTOMIZATION);
  } catch (e) {
    console.log("can't parse custom design params");
    return;
  }

  let css = '';
  if (designCustomParams.primary_color) {
    css +=
      '.join-area a.join{ background-color: ' +
      designCustomParams.primary_color +
      '}';
    css +=
      '.table-item .action a.download{ background-color: ' +
      designCustomParams.primary_color +
      '}';
    css +=
      'ul.pagination li, ul.pagination button { border-color: ' +
      designCustomParams.primary_color +
      '}';
  }

  if (designCustomParams.secondary_color) {
    css +=
      '.join-area a.join:hover{ background-color: ' +
      designCustomParams.secondary_color +
      '}';
    css +=
      '.table-item .action a.download:hover{ background-color: ' +
      designCustomParams.secondary_color +
      '}';
    css +=
      'ul.pagination li:hover, ul.pagination button:hover, ul.pagination li.active { background-color: ' +
      designCustomParams.secondary_color +
      '}';
  }

  if (css !== '') {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
};
