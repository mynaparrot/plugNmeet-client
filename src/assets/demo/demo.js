/**
 * Logic for the plugNmeet demo login pages.
 * One file serves both pages; the active flow is chosen from <body data-page="standard|agent">.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const ICONS = {
    info: '',
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
  };

  function showStatus(kind, message) {
    const box = $('status');
    const text = $('status-text');
    const icon = $('status-icon');
    if (!box || !text || !icon) return;
    box.hidden = false;
    box.dataset.kind = kind;
    text.textContent = message;
    icon.innerHTML = kind === 'info' ? '<span class="spinner"></span>' : ICONS[kind] || '';
    if (box.getBoundingClientRect().top < 0) {
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function setBusyState(busy, busyLabel, idleLabel) {
    $('launch-btn').disabled = busy;
    $('reset-btn').disabled = busy;
    $('launch-label').textContent = busy ? busyLabel : idleLabel;
  }

  const THEME_KEY = 'plugnmeet-demo-theme';

  function initTheme() {
    const toggle = $('theme-toggle');
    const apply = (theme) => {
      document.body.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#001222' : '#ffffff');
      if (!toggle) return;
      toggle.querySelectorAll('.theme-option').forEach((option) => {
        option.classList.toggle('is-active', option.dataset.theme === theme);
      });
      toggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
      );
    };

    let theme = 'light';
    try {
      theme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      theme = 'light';
    }
    apply(theme);

    if (!toggle) return;
    toggle.addEventListener('click', () => {
      theme = document.body.classList.contains('dark') ? 'light' : 'dark';
      apply(theme);
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // storage may be unavailable (private mode); the toggle still works
      }
    });
  }

  const randomRoom = () => 'room-' + Math.random().toString(36).slice(2, 8);
  const randomName = () => 'user-' + Math.floor(Math.random() * 100);

  const serverUrl = () =>
    (window.plugNmeetConfig && window.plugNmeetConfig.serverUrl) ||
    window.PLUG_N_MEET_SERVER_URL ||
    '';

  async function hashSignature(secretKey, message) {
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function request(apiKey, secretKey, body, method) {
    const raw = JSON.stringify(body);
    const signature = await hashSignature(secretKey, raw);
    const base = serverUrl();
    if (!base) {
      throw new Error('plugNmeet server URL is not configured.');
    }

    let response;
    try {
      response = await fetch(base.replace(/\/$/, '') + '/auth/' + method, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': apiKey,
          'HASH-SIGNATURE': signature,
        },
        body: raw,
      });
    } catch {
      throw new Error('Network error: could not reach ' + base);
    }

    let json = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(
        (json && json.msg) || response.statusText || 'Request failed (' + response.status + ')',
      );
    }
    return json;
  }

  async function copyText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard API is not available in this browser.');
    }
    await navigator.clipboard.writeText(text);
  }

  function initStandard() {
    const form = $('loginForm');
    const statusBox = $('status');
    const launchBtn = $('launch-btn');
    const previewEl = $('preview');

    const setBusy = (busy) => setBusyState(busy, 'Joining room…', 'Enter room');

    let API_KEY = '';
    let API_SECRET = '';
    let previewTimer = null;

    const toUrl = window.location.href
      .replace(/[?#].*$/, '')
      .replace(/\/login(?:\.html)?\/?$/i, '')
      .replace(/\/$/, '');

    const value = (id) => $(id).value.trim();
    const roomMode = () => document.querySelector('input[name="room_mode"]:checked').value;
    const userType = () => document.querySelector('input[name="user_type"]:checked').value;
    const currentRoomId = () =>
      roomMode() === 'custom' ? value('room_id_input') : $('room_id_select').value;

    function updateSummary() {
      const room = currentRoomId() || '—';
      const role = userType() === 'admin' ? 'Admin' : 'Participant';
      $('sum-role').textContent = role;
      $('sum-room').textContent = room;
      $('hero-role').textContent = role;
      $('hero-room').textContent = room;
      $('sum-e2ee').hidden = !$('e2ee_enabled').checked;
      schedulePreview();
    }

    function updatePreview() {
      if (!previewEl) return;
      const roomId = currentRoomId();
      if (!roomId) {
        previewEl.textContent = '// Choose a room to preview the payload.';
        return;
      }
      try {
        previewEl.textContent = JSON.stringify(
          { room_id: roomId, metadata: buildRoomInfo(roomId).metadata },
          null,
          2,
        );
      } catch (err) {
        previewEl.textContent = '// ' + err.message;
      }
    }

    function schedulePreview() {
      window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(updatePreview, 180);
    }

    function syncRoomMode() {
      const custom = roomMode() === 'custom';
      $('room-preset').hidden = custom;
      $('room-custom').hidden = !custom;
      if (custom && !$('room_id_input').value) {
        $('room_id_input').value = randomRoom();
      }
      updateSummary();
    }

    function syncE2ee() {
      const enabled = $('e2ee_enabled').checked;
      const selfInsert = enabled && $('e2ee_self_insert').checked;
      $('e2ee_fields').hidden = !enabled;
      $('e2ee_key_field').hidden = !enabled || selfInsert;
      $('e2ee_notice').hidden = !selfInsert;
    }

    function e2eeFeatures() {
      const enabled = $('e2ee_enabled').checked;
      const selfInsert = enabled && $('e2ee_self_insert').checked;
      const features = {
        is_enabled: enabled,
        included_chat_messages: enabled && $('e2ee_chat').checked,
        included_whiteboard: enabled && $('e2ee_whiteboard').checked,
        enabled_self_insert_encryption_key: selfInsert,
      };
      const key = enabled && !selfInsert ? value('e2ee_key') : '';
      if (key) features.encryption_key = key;
      return features;
    }

    function buildRoomInfo(roomId) {
      return {
        room_id: roomId,
        empty_timeout: 60 * 60 * 2,
        metadata: {
          room_title: 'Demo room',
          welcome_message:
            'Welcome to plugNmeet!<br /> To share microphone click mic icon from bottom left side.',
          room_features: {
            allow_webcams: true,
            mute_on_start: false,
            allow_screen_share: true,
            admin_only_webcams: false,
            allow_view_other_webcams: true,
            allow_view_other_users_list: true,
            room_duration: 0,
            enable_analytics: true,
            allow_virtual_bg: true,
            allow_raise_hand: true,
            allow_reactions: true,
            recording_features: {
              is_allow: true,
              is_allow_cloud: true,
              is_allow_local: true,
              enable_auto_cloud_recording: false,
              only_record_admin_webcams: false,
            },
            external_broadcasting_features: {
              is_allow: true,
              is_allow_rtmp: true,
            },
            chat_features: {
              is_allow: true,
              is_allow_file_upload: true,
              max_file_size: 50,
              allowed_file_types: ['jpg', 'png', 'zip', 'pdf'],
            },
            shared_note_pad_features: {
              is_allow: true,
            },
            whiteboard_features: {
              is_allow: true,
            },
            external_media_player_features: {
              is_allow: true,
            },
            waiting_room_features: {
              is_active: true,
            },
            breakout_room_features: {
              is_allow: true,
              allowed_number_rooms: 6,
            },
            display_external_link_features: {
              is_allow: true,
            },
            ingress_features: {
              is_allow: true,
            },
            polls_features: {
              is_allow: true,
            },
            sip_dial_in_features: {
              is_allow: true,
            },
            countdown_timer_features: {
              is_allow: true,
            },
            insights_features: {
              is_allow: true,
              transcription_features: {
                is_allow: true,
                is_allow_translation: true,
                is_allow_speech_synthesis: true,
              },
              chat_translation_features: {
                is_allow: true,
              },
              ai_features: {
                is_allow: true,
                ai_text_chat_features: {
                  is_allow: true,
                },
                meeting_summarization_features: {
                  is_allow: true,
                },
              },
              ai_agent_features: {
                is_allow: true,
                agent_display_name: 'AI Practice Assistant',
                topic: 'General Practice & Product Demo',
                system_prompt:
                  'You are an interactive practice assistant and product guide inside a plugNmeet room. Keep spoken responses concise (1-3 sentences), use the whiteboard and shared notepad to illustrate concepts when helpful, and create quick polls or quizzes to check understanding.',
                auto_join_on_first_participant: false,
                allow_whiteboard_write: true,
                allow_vision_capture: true,
                allow_polls: true,
                allow_chat_message: true,
                allow_notepad_write: true,
                strict_topic_enforcement: false,
                max_session_seconds: 1800,
                mcpServers: {
                  'plugnmeet-docs': {
                    url: 'https://docs-mcp.plugnmeet.org/mcp',
                  },
                },
              },
            },
            end_to_end_encryption_features: e2eeFeatures(),
          },
        },
      };
    }

    const sendRequest = (body, method) => request(API_KEY, API_SECRET, body, method);

    async function launch(event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        showStatus('error', 'Please complete the required fields.');
        return;
      }

      const roomId = currentRoomId();
      const name = value('name');
      const userId = value('user_id');
      if (!roomId) {
        showStatus('error', 'Enter a room id.');
        return;
      }

      API_KEY = value('api_key');
      API_SECRET = value('api_secret');
      if (!API_KEY || !API_SECRET) {
        showStatus('error', 'Enter your plugNmeet API key and secret.');
        return;
      }

      setBusy(true);
      try {
        showStatus('info', 'Checking room status…');
        const activeRes = await sendRequest({ room_id: roomId }, 'room/isRoomActive');
        if (activeRes && activeRes.status === false) {
          throw new Error(activeRes.msg || 'Could not check the room.');
        }

        if (!(activeRes && activeRes.is_active)) {
          showStatus('info', 'Creating the room…');
          const createRes = await sendRequest(buildRoomInfo(roomId), 'room/create');
          if (!createRes || createRes.status === false) {
            throw new Error((createRes && createRes.msg) || 'Room creation failed.');
          }
        }

        showStatus('info', 'Issuing a join token…');
        const joinRes = await sendRequest(
          {
            room_id: roomId,
            user_info: {
              is_admin: userType() === 'admin',
              name,
              user_id: userId,
            },
          },
          'room/getJoinToken',
        );
        if (!joinRes || joinRes.status === false || !joinRes.token) {
          throw new Error((joinRes && joinRes.msg) || 'Could not get a join token.');
        }

        showStatus('success', 'Room ready — joining…');
        window.location.href = toUrl + '/?access_token=' + encodeURIComponent(joinRes.token);
      } catch (err) {
        setBusy(false);
        showStatus('error', err.message || String(err));
      }
    }

    $('user_id').value = Date.now();
    $('name').value = randomName();
    syncRoomMode();
    updateSummary();
    updatePreview();
    syncE2ee();

    document.querySelectorAll('input[name="room_mode"]').forEach((input) => {
      input.addEventListener('change', syncRoomMode);
    });
    document.querySelectorAll('input[name="user_type"]').forEach((input) => {
      input.addEventListener('change', updateSummary);
    });
    $('e2ee_enabled').addEventListener('change', syncE2ee);
    $('e2ee_self_insert').addEventListener('change', syncE2ee);

    $('toggle-secret').addEventListener('click', (event) => {
      const input = $('api_secret');
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
      event.currentTarget.setAttribute(
        'aria-label',
        reveal ? 'Hide API secret' : 'Show API secret',
      );
      input.focus();
    });

    $('random-room').addEventListener('click', () => {
      $('room_id_input').value = randomRoom();
      updateSummary();
    });
    $('list-room').addEventListener('click', () => {
      document.querySelector('input[name="room_mode"][value="preset"]').checked = true;
      syncRoomMode();
    });
    $('random-name').addEventListener('click', () => {
      $('name').value = randomName();
    });
    $('random-user-id').addEventListener('click', () => {
      $('user_id').value = Date.now();
    });

    $('copy-preview').addEventListener('click', async (event) => {
      event.preventDefault();
      const btn = event.currentTarget;
      const original = btn.textContent;
      const text = previewEl.textContent || '';
      try {
        await copyText(text);
        btn.textContent = 'Copied';
        window.setTimeout(() => {
          btn.textContent = original;
        }, 1400);
      } catch {
        showStatus('error', 'Could not copy to the clipboard.');
      }
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !launchBtn.disabled) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('input', updateSummary);
    form.addEventListener('change', updateSummary);
    form.addEventListener('submit', launch);
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        statusBox.hidden = true;
        setBusy(false);
        $('api_secret').type = 'password';
        $('toggle-secret').textContent = 'Show';
        $('toggle-secret').setAttribute('aria-label', 'Show API secret');
        $('name').value = randomName();
        $('user_id').value = Date.now();
        syncRoomMode();
        updateSummary();
        syncE2ee();
      }, 0);
    });
  }

  function initAgent() {
    const form = $('agentForm');
    const statusBox = $('status');
    const launchBtn = $('launch-btn');
    const previewEl = $('preview');
    const sumSessions = $('sum-sessions');
    const sumDuration = $('sum-duration');
    const sumMcp = $('sum-mcp');
    const sumMcpWrap = $('sum-mcp-wrap');

    const setBusy = (busy) => setBusyState(busy, 'Launching session…', 'Launch AI session');

    let API_KEY = '';
    let API_SECRET = '';
    let previewTimer = 0;

    const toUrl = window.location.href
      .replace(/[?#].*$/, '')
      .replace(/\/login-agent(?:\.html)?\/?$/i, '')
      .replace(/\/$/, '');

    const value = (id) => $(id).value.trim();
    const number = (id, fallback) => {
      const n = Number($(id).value);
      return Number.isFinite(n) ? n : fallback;
    };
    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const csv = (id) =>
      $(id)
        .value.split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    const randomId = () => Math.random().toString(36).slice(2, 8);

    const PRESETS = {
      demo: {
        name: 'Product demo guide',
        topic: 'Guided product demo & questions',
        prompt:
          'You are a product demo guide inside a plugNmeet room. Walk the visitor through the product in short, spoken steps, answer questions in 1-3 sentences, sketch flows on the whiteboard and use quick polls to confirm understanding.',
        subtopics: 'product overview, core workflows, pricing basics',
        forbidden: 'legal advice, competitor speculation',
      },
      support: {
        name: 'Support triage agent',
        topic: 'First-line support triage',
        prompt:
          'You are a calm first-line support agent. Ask one clarifying question at a time, restate the problem, suggest the shortest safe fix, and hand off to a human when the issue needs an account change. Keep replies under three sentences.',
        subtopics: 'login issues, billing questions, feature how-to',
        forbidden: 'refunds, account deletion, security disclosures',
      },
      interview: {
        name: 'Interview coach',
        topic: 'Practice interview for a technical role',
        prompt:
          'You are an interview coach. Ask one interview question at a time, wait for the answer, then give one concrete improvement and a follow-up question. Keep spoken feedback short and encouraging.',
        subtopics: 'behavioural questions, system design basics, role fit',
        forbidden: 'salary negotiation, personal advice',
      },
      tutor: {
        name: 'Language tutor',
        topic: 'Conversation practice in the target language',
        prompt:
          'You are a patient language tutor. Speak mostly in the target language, keep turns short, gently correct one mistake per turn and use the notepad for vocabulary the learner should review.',
        subtopics: 'everyday conversation, travel, workplace small talk',
        forbidden: 'medical advice, politics, religion',
        target_lang: 'es-ES',
        instruction_lang: 'en-US',
      },
    };

    function roomMode() {
      return document.querySelector('input[name="room_mode"]:checked').value;
    }

    function currentRoomId() {
      return roomMode() === 'custom' ? value('room_id_input') : $('room_id_select').value;
    }

    function syncRoomMode() {
      const custom = roomMode() === 'custom';
      $('room-preset').hidden = custom;
      $('room-custom').hidden = !custom;
      if (custom && !$('room_id_input').value) {
        $('room_id_input').value = 'agent-room-' + randomId();
      }
      updatePreview();
    }

    function syncWebFetch() {
      $('knowledge-fields').hidden = !$('allow_web_fetch').checked;
      updatePreview();
    }

    function syncByok() {
      $('byok_fields').disabled = !$('byok_enabled').checked;
      updatePreview();
    }

    function syncSpeakingRate() {
      $('speaking_rate_value').textContent = Number($('speaking_rate').value).toFixed(1) + '×';
    }

    function mcpServers() {
      const servers = {};
      for (const i of [1, 2]) {
        const name = value('mcp' + i + '_name');
        const url = value('mcp' + i + '_url');
        if (!url) continue;
        if (!name) {
          throw new Error('MCP server ' + i + ': enter a name.');
        }
        if (!/^https:\/\//i.test(url)) {
          throw new Error('MCP server ' + i + ': the URL must start with https://');
        }
        if (servers[name]) {
          throw new Error('MCP server ' + i + ': ' + name + ' is already used by another server.');
        }
        const cfg = { url };
        const tools = csv('mcp' + i + '_tools');
        if (tools.length) cfg.allowed_tools = tools;
        const scope = value('mcp' + i + '_scope');
        if (scope) cfg.scope = scope;
        const rawHeaders = value('mcp' + i + '_headers');
        if (rawHeaders) {
          let headers;
          try {
            headers = JSON.parse(rawHeaders);
          } catch {
            throw new Error('MCP server ' + i + ': headers must be a JSON object.');
          }
          if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
            throw new Error('MCP server ' + i + ': headers must be a JSON object.');
          }
          for (const headerValue of Object.values(headers)) {
            if (typeof headerValue !== 'string') {
              throw new Error('MCP server ' + i + ': header values must be strings.');
            }
          }
          cfg.headers = headers;
        }
        servers[name] = cfg;
      }
      return servers;
    }

    function customProvider() {
      if (!$('byok_enabled').checked) return null;
      const apiKey = value('byok_api_key');
      if (!apiKey) {
        throw new Error('BYOK: enter the provider API key.');
      }
      const provider = {
        provider: $('byok_provider').value,
        api_key: apiKey,
      };
      const optional = [
        'endpoint',
        'auth_header',
        'realtime_model',
        'delegation_model',
        'summarize_model',
      ];
      for (const key of optional) {
        const v = value('byok_' + key);
        if (v) provider[key] = v;
      }
      return provider;
    }

    function agentFeatures() {
      const topic = value('topic');
      const prompt = value('system_prompt');
      if (!topic) throw new Error('Enter a topic for the agent.');
      if (!prompt) throw new Error('Enter a system prompt for the agent.');

      const concurrency = Math.round(number('max_concurrent_sessions', 4));
      if (concurrency < 1) throw new Error('Max concurrent sessions must be at least 1.');

      const features = {
        is_allow: true,
        session_mode: 'AI_AGENT_SESSION_MODE_OPEN_PER_USER',
        auto_session_config: {
          max_concurrent_sessions: clamp(concurrency, 1, 16),
          auto_start_agent: $('auto_start_agent').checked,
        },
        agent_display_name: value('agent_display_name') || 'AI Assistant',
        system_prompt: prompt,
        topic: topic,
        strict_topic_enforcement: $('strict_topic_enforcement').checked,
        allow_whiteboard_write: $('allow_whiteboard_write').checked,
        allow_vision_capture: $('allow_vision_capture').checked,
        allow_polls: $('allow_polls').checked,
        allow_chat_message: $('allow_chat_message').checked,
        allow_notepad_write: $('allow_notepad_write').checked,
        allow_web_fetch: $('allow_web_fetch').checked,
        max_session_seconds: clamp(Math.round(number('max_session_seconds', 1800)), 60, 7200),
        max_audio_minutes: clamp(Math.round(number('max_audio_minutes', 0)), 0, 240),
        topic_anchor_interval_turns: clamp(
          Math.round(number('topic_anchor_interval_turns', 6)),
          3,
          12,
        ),
      };

      const subtopics = csv('allowed_subtopics');
      if (subtopics.length) features.allowed_subtopics = subtopics;
      const forbidden = csv('forbidden_topics');
      if (forbidden.length) features.forbidden_topics = forbidden;

      const spoken = value('spoken_lang');
      if (spoken) features.spoken_lang = spoken;
      const target = value('target_lang');
      if (target) features.target_lang = target;
      const instruction = value('instruction_lang');
      if (instruction) features.instruction_lang = instruction;
      const voice = value('voice');
      if (voice) features.voice = voice;
      features.speaking_rate = Number($('speaking_rate').value);

      if (features.allow_web_fetch) {
        const urls = csv('allowed_knowledge_urls');
        if (!urls.length) {
          throw new Error('Add at least one HTTPS knowledge URL, or turn off web fetch.');
        }
        for (const url of urls) {
          if (!/^https:\/\//i.test(url)) {
            throw new Error('Knowledge URLs must start with https://');
          }
        }
        features.allowed_knowledge_urls = urls;
        features.knowledge_cache_ttl_seconds = clamp(
          Math.round(number('knowledge_cache_ttl_seconds', 3600)),
          60,
          86400,
        );
      }

      const context = value('previous_session_context');
      if (context) features.previous_session_context = context;

      const servers = mcpServers();
      if (Object.keys(servers).length) features.mcp_servers = servers;

      const provider = customProvider();
      if (provider) features.custom_provider = provider;

      return features;
    }

    function buildRoomInfo() {
      return {
        room_id: currentRoomId(),
        empty_timeout: 60 * 60 * 2,
        metadata: {
          room_title: value('room_title') || 'AI Agent Session',
          welcome_message: 'Welcome! You are about to join your private AI session.',
          room_features: {
            allow_webcams: false,
            allow_screen_share: false,
            mute_on_start: false,
            allow_view_other_webcams: false,
            allow_view_other_users_list: false,
            allow_raise_hand: false,
            allow_reactions: false,
            room_duration: 0,
            enable_analytics: true,
            chat_features: {
              is_allow: true,
              is_allow_file_upload: false,
            },
            shared_note_pad_features: {
              is_allow: true,
            },
            whiteboard_features: {
              is_allow: true,
            },
            polls_features: {
              is_allow: true,
            },
            insights_features: {
              is_allow: true,
              transcription_features: {
                is_allow: true,
                is_allow_translation: false,
                is_allow_speech_synthesis: false,
              },
              ai_features: {
                is_allow: true,
                ai_text_chat_features: {
                  is_allow: true,
                },
                meeting_summarization_features: {
                  is_allow: true,
                },
              },
              ai_agent_features: agentFeatures(),
            },
          },
        },
      };
    }

    function buildUserInfo() {
      const userType = document.querySelector('input[name="user_type"]:checked').value;
      const name = value('name');
      const userId = value('user_id');
      if (!name) throw new Error('Enter the participant name.');
      if (!userId) throw new Error('Enter the participant user ID.');
      if (!currentRoomId()) throw new Error('Enter a room id.');
      return {
        is_admin: userType === 'admin',
        name,
        user_id: userId,
      };
    }

    function humanDuration(seconds) {
      const minutes = Math.max(1, Math.round(seconds / 60));
      if (minutes < 60) return minutes + ' min';
      const hours = minutes / 60;
      return (Number.isInteger(hours) ? hours : hours.toFixed(1)) + ' hr';
    }

    function updateSummary() {
      const sessions = clamp(Math.round(number('max_concurrent_sessions', 4)), 1, 16);
      sumSessions.textContent = sessions;
      const seconds = clamp(Math.round(number('max_session_seconds', 1800)), 60, 7200);
      sumDuration.textContent = humanDuration(seconds);
      const mcpCount = [1, 2].filter((i) => value('mcp' + i + '_url')).length;
      sumMcpWrap.hidden = mcpCount === 0;
      if (mcpCount) sumMcp.textContent = mcpCount;
    }

    function updatePreview() {
      if (!$('preview')) return;
      updateSummary();
      try {
        previewEl.textContent = JSON.stringify(
          { room_id: currentRoomId(), metadata: buildRoomInfo().metadata },
          null,
          2,
        );
      } catch (err) {
        previewEl.textContent = '// ' + err.message;
      }
    }

    function schedulePreview() {
      window.clearTimeout(previewTimer);
      previewTimer = window.setTimeout(updatePreview, 180);
    }

    function delay(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    const sendRequest = (body, method) => request(API_KEY, API_SECRET, body, method);

    async function launch(event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        showStatus('error', 'Please complete the required fields.');
        return;
      }

      let roomInfo;
      let userInfo;
      try {
        roomInfo = buildRoomInfo();
        userInfo = buildUserInfo();
      } catch (err) {
        showStatus('error', err.message);
        return;
      }

      API_KEY = value('api_key');
      API_SECRET = value('api_secret');
      if (!API_KEY || !API_SECRET) {
        showStatus('error', 'Enter your plugNmeet API key and secret.');
        return;
      }

      setBusy(true);
      try {
        showStatus('info', 'Checking room status…');
        const activeRes = await sendRequest({ room_id: roomInfo.room_id }, 'room/isRoomActive');
        let isActive = !!(activeRes && activeRes.is_active);

        if (isActive && $('recreate_room').checked) {
          showStatus('info', 'Ending the active room…');
          const endRes = await sendRequest({ room_id: roomInfo.room_id }, 'room/endRoom');
          if (endRes && endRes.status === false) {
            throw new Error(endRes.msg || 'Could not end the active room.');
          }
          isActive = false;
          await delay(1200);
        }

        if (!isActive) {
          showStatus('info', 'Creating the AI agent room…');
          const createRes = await sendRequest(roomInfo, 'room/create');
          if (!createRes || createRes.status === false) {
            throw new Error((createRes && createRes.msg) || 'Room creation failed.');
          }
        } else {
          showStatus('info', 'Room is already active — joining with its existing configuration…');
        }

        showStatus('info', 'Issuing a join token…');
        const joinRes = await sendRequest(
          { room_id: roomInfo.room_id, user_info: userInfo },
          'room/getJoinToken',
        );
        if (!joinRes || joinRes.status === false || !joinRes.token) {
          throw new Error((joinRes && joinRes.msg) || 'Could not get a join token.');
        }

        showStatus('success', 'Session ready — redirecting…');
        window.location.href = toUrl + '/?access_token=' + encodeURIComponent(joinRes.token);
      } catch (err) {
        setBusy(false);
        showStatus('error', err.message || String(err));
      }
    }

    document.getElementById('user_id').value = Date.now();
    document.getElementById('name').value = 'user-' + Math.floor(Math.random() * 100);
    syncSpeakingRate();
    syncRoomMode();
    syncWebFetch();
    syncByok();
    updatePreview();

    document.querySelectorAll('input[name="room_mode"]').forEach((input) => {
      input.addEventListener('change', syncRoomMode);
    });
    document.querySelectorAll('input[name="user_type"]').forEach((input) => {
      input.addEventListener('change', updatePreview);
    });
    $('allow_web_fetch').addEventListener('change', syncWebFetch);
    $('byok_enabled').addEventListener('change', syncByok);
    $('speaking_rate').addEventListener('input', () => {
      syncSpeakingRate();
      schedulePreview();
    });
    $('agent_display_name').addEventListener('input', (e) => {
      $('hero-agent-name').textContent = e.target.value.trim() || 'AI Assistant';
    });

    $('toggle-secret').addEventListener('click', (event) => {
      const input = $('api_secret');
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
      event.currentTarget.setAttribute(
        'aria-label',
        reveal ? 'Hide API secret' : 'Show API secret',
      );
      input.focus();
    });

    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = PRESETS[btn.dataset.preset];
        if (!preset) return;
        $('agent_display_name').value = preset.name;
        $('topic').value = preset.topic;
        $('system_prompt').value = preset.prompt;
        $('allowed_subtopics').value = preset.subtopics || '';
        $('forbidden_topics').value = preset.forbidden || '';
        $('target_lang').value = preset.target_lang || '';
        $('instruction_lang').value = preset.instruction_lang || '';
        $('hero-agent-name').textContent = preset.name;
        document.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updatePreview();
      });
    });

    $('random-room').addEventListener('click', () => {
      $('room_id_input').value = 'agent-room-' + randomId();
      updatePreview();
    });
    $('random-name').addEventListener('click', () => {
      $('name').value = 'user-' + Math.floor(Math.random() * 100);
      updatePreview();
    });
    $('random-user-id').addEventListener('click', () => {
      $('user_id').value = Date.now();
      updatePreview();
    });

    document.querySelectorAll('[data-clear-mcp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.clearMcp;
        ['name', 'url', 'tools', 'headers'].forEach((key) => {
          $('mcp' + i + '_' + key).value = '';
        });
        $('mcp' + i + '_scope').value = '';
        updatePreview();
      });
    });

    document.querySelectorAll('.chip[data-seconds]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document
          .querySelectorAll('.chip[data-seconds]')
          .forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        $('max_session_seconds').value = chip.dataset.seconds;
        updatePreview();
      });
    });

    $('max_session_seconds').addEventListener('input', () => {
      const seconds = $('max_session_seconds').value;
      document.querySelectorAll('.chip[data-seconds]').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.seconds === seconds);
      });
    });

    $('copy-preview').addEventListener('click', async (event) => {
      event.preventDefault();
      const btn = event.currentTarget;
      const original = btn.textContent;
      const text = previewEl.textContent || '';
      try {
        await copyText(text);
        btn.textContent = 'Copied';
        window.setTimeout(() => {
          btn.textContent = original;
        }, 1400);
      } catch {
        showStatus('error', 'Could not copy to the clipboard.');
      }
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !launchBtn.disabled) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('input', schedulePreview);
    form.addEventListener('change', schedulePreview);
    form.addEventListener('submit', launch);
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        statusBox.hidden = true;
        setBusy(false);
        $('api_secret').type = 'password';
        $('toggle-secret').textContent = 'Show';
        $('name').value = 'user-' + Math.floor(Math.random() * 100);
        $('user_id').value = Date.now();
        document.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
        $('hero-agent-name').textContent = $('agent_display_name').value.trim() || 'AI Assistant';
        syncRoomMode();
        syncWebFetch();
        syncByok();
        syncSpeakingRate();
        updatePreview();
      }, 0);
    });
  }

  initTheme();

  const page = document.body.dataset.page;
  if (page === 'agent') initAgent();
  else initStandard();
})();
