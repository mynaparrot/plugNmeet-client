(async () => {
  let isShowingPagination = false;
  let totalRecordings = 0;
  let currentPage = 1;
  const limitPerPage = 10;

  const dom = {
    joinBtn: document.querySelector('.join'),
    endBtn: document.querySelector('.end'),
    recordingListsBody: document.getElementById('recordingListsBody'),
    pagination: document.querySelector('.pagination'),
    backwardBtn: document.getElementById('backward'),
    forwardBtn: document.getElementById('forward'),
    recordingItemTemplate: document.getElementById('recording-item-template'),
    errorContainer: document.getElementById('error-container'),
  };

  const init = async () => {
    if (IS_ADMIN) {
      await isSessionActive();
      setInterval(isSessionActive, 1000 * 60 * 5);
    }

    loadRecordingsForPage(currentPage);
    designCustomization();
    attachEventListeners();
  };

  const attachEventListeners = () => {
    dom.joinBtn.addEventListener('click', joinSession);
    dom.endBtn.addEventListener('click', () => IS_ADMIN && endSession());

    dom.pagination.addEventListener('click', (e) => {
      if (e.target.id === 'backward' && !dom.backwardBtn.disabled) {
        currentPage--;
        loadRecordingsForPage(currentPage);
      } else if (e.target.id === 'forward' && !dom.forwardBtn.disabled) {
        currentPage++;
        loadRecordingsForPage(currentPage);
      }
    });

    dom.recordingListsBody.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('download')) {
        downloadRecording(target.dataset.recording);
      } else if (target.classList.contains('delete')) {
        deleteRecording(target.dataset.recording);
      }
    });
  };

  const joinSession = async () => {
    try {
      const res = await callLtiApi('/room/join', {});
      if (res.status) {
        let url = `${window.plugNmeetConfig.serverUrl}/?access_token=${res.token}`;
        if (window.DESIGN_CUSTOMIZATION) {
          url += `&custom_design=${encodeURIComponent(window.DESIGN_CUSTOMIZATION)}`;
        }
        window.open(url, '_blank');

        if (IS_ADMIN) {
          dom.endBtn.style.display = '';
        }
      } else {
        showError(res.msg);
      }
    } catch (error) {
      showError('Failed to join session.');
    }
  };

  const endSession = async () => {
    try {
      const res = await callLtiApi('/room/end', {});
      if (res.status) {
        dom.endBtn.style.display = 'none';
      } else {
        showError(res.msg);
      }
    } catch (error) {
      showError('Failed to end session.');
    }
  };

  const isSessionActive = async () => {
    try {
      const res = await callLtiApi('/room/isActive', {});
      dom.endBtn.style.display = res.is_active ? '' : 'none';
    } catch (error) {
      // Do nothing, button will remain hidden
    }
  };

  const fetchRecordings = async (from = 0, limit = 10, order_by = 'DESC') => {
    try {
      const res = await callLtiApi('/recording/fetch', {
        from,
        limit,
        order_by,
      });
      if (res.status) {
        if (!res.result.total_recordings) {
          showMessage('No recordings found.');
          return;
        }
        const { recordings_list, total_recordings } = res.result;
        if (total_recordings > recordings_list.length && !isShowingPagination) {
          totalRecordings = total_recordings;
          showPagination();
          isShowingPagination = true;
        }
        displayRecordings(recordings_list);
      } else {
        showMessage(res.msg);
      }
    } catch (error) {
      showMessage('Failed to fetch recordings.');
    }
  };

  const downloadRecording = async (recordId) => {
    try {
      const res = await callLtiApi('/recording/download', {
        record_id: recordId,
      });
      if (res.status) {
        const url = `${window.plugNmeetConfig.serverUrl}/download/recording/${res.token}`;
        window.open(url, '_blank');
      } else {
        showError(res.msg);
      }
    } catch (error) {
      showError('Failed to download recording.');
    }
  };

  const deleteRecording = async (recordId) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      try {
        const res = await callLtiApi('/recording/delete', {
          record_id: recordId,
        });
        if (res.status) {
          document.getElementById(recordId).remove();
        } else {
          showError(res.msg);
        }
      } catch (error) {
        showError('Failed to delete recording.');
      }
    }
  };

  const callLtiApi = async (path, body) => {
    const url = `${window.plugNmeetConfig.serverUrl}/lti/v1/api${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: TOKEN,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`API call failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  };

  const displayRecordings = (recordings) => {
    dom.recordingListsBody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (const recording of recordings) {
      const template = dom.recordingItemTemplate.content.cloneNode(true);
      const row = template.querySelector('.table-item');
      row.id = recording.record_id;
      row.querySelector('.recording-date').textContent = new Date(
        recording.creation_time * 1000,
      ).toLocaleString();
      row.querySelector('.meeting-date').textContent = new Date(
        recording.room_creation_time * 1000,
      ).toLocaleString();
      row.querySelector('.file-size').textContent = recording.file_size;

      const downloadBtn = row.querySelector('.download');
      downloadBtn.dataset.recording = recording.record_id;

      const deleteBtn = row.querySelector('.delete');
      if (IS_ADMIN) {
        deleteBtn.style.display = '';
        deleteBtn.dataset.recording = recording.record_id;
      }

      fragment.appendChild(template);
    }
    dom.recordingListsBody.appendChild(fragment);
  };

  const showPagination = () => {
    currentPage = 1;
    dom.pagination.style.display = 'flex';
    loadRecordingsForPage(currentPage);
  };

  const loadRecordingsForPage = (page) => {
    dom.recordingListsBody.innerHTML = '';
    const from = (page - 1) * limitPerPage;

    dom.backwardBtn.disabled = page === 1;
    dom.forwardBtn.disabled = page >= Math.ceil(totalRecordings / limitPerPage);

    fetchRecordings(from, limitPerPage);
  };

  const showMessage = (msg) => {
    dom.recordingListsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">${msg}</td></tr>`;
  };

  const showError = (msg) => {
    dom.errorContainer.textContent = msg;
    dom.errorContainer.style.display = 'block';

    setTimeout(() => {
      dom.errorContainer.style.display = 'none';
      dom.errorContainer.textContent = '';
    }, 5000); // Hide after 5 seconds
  };

  const designCustomization = () => {
    if (!window.DESIGN_CUSTOMIZATION) return;

    try {
      const params = JSON.parse(window.DESIGN_CUSTOMIZATION);
      const root = document.documentElement;
      if (params.primary_color) {
        root.style.setProperty('--primary-color', params.primary_color);
      }
      if (params.secondary_color) {
        root.style.setProperty('--primary-color-hover', params.secondary_color);
      }
    } catch (e) {
      console.error("Can't parse custom design params", e);
    }
  };

  window.addEventListener('load', init);
})();
