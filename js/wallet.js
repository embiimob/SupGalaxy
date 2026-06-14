const P2FK_BASE_URL = 'https://p2fk.io';
    const TRENDING_SEARCHES_ENDPOINT = `${P2FK_BASE_URL}/GetTrendingRootSearches?qty=20`;
    const P2FK_CHUNK_SIZE_BYTES = 20;
    const P2FK_DEFAULT_VERSION_BYTE = 0x6f;
    const P2FK_PADDING_CHAR = '#';
    const P2FK_SIGNATURE_VERSION_MARKER = '88';
    const INTERNAL_WALLET_ID = 'internal';
    const INTERNAL_WALLET_LABEL = '🔑 Built-in (testnet3 legacy)';
    const INTERNAL_WALLET_STORAGE_KEY = 'sup_iw_v1';
    const INTERNAL_WALLET_MIN_PASSWORD_LENGTH = 12;
    const INTERNAL_WALLET_PBKDF2_ITERATIONS = 600000;
    const INTERNAL_CHANGE_ADDRESS_COUNT = 2;
    const INTERNAL_CHANGE_DERIVATION_PREFIX = 'sup:testnet3:change:';
    const MEMPOOL_TESTNET_API = 'https://mempool.space/testnet/api';
    const BTC_DUST_LIMIT_SAT = 546; // P2PKH dust threshold in satoshis
    const COMPOSER_AMOUNT_PER_RECIPIENT = BTC_DUST_LIMIT_SAT / 1e8;
    const BTC_DEFAULT_FEE_RATE = 10; // sat/vbyte fallback when fee API is unreachable
    const BTC_MIN_FEE_RATE = 2; // sat/vbyte absolute minimum
    const IPFS_GATEWAY_URLS = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/',
      'https://gateway.pinata.cloud/ipfs/'
    ];
    const USE_P2FK_MAINNET = false;

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');
    const decodeHtmlEntities = (text) => {
      if (typeof text !== 'string') return '';
      return text
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#0?39;|&apos;/gi, "'");
    };
    const SALT_EMOJI_POOL = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '🤗', '🤠', '🥳', '🤓', '😎', '🤖', '👾', '👻', '🎃', '💀', '🧠', '🫀', '🦾', '🦿', '👁️', '🔥', '⚡', '💥', '✨', '🌟', '⭐', '🌈', '☀️', '🌙', '🪐', '🌌', '🌊', '🌀', '❄️', '☁️', '🌤️', '🌋', '🧊', '🌱', '🌿', '🍀', '🌵', '🌴', '🌺', '🌸', '🌼', '🍄', '🪷', '🦋', '🐝', '🐞', '🦄', '🐉', '🐲', '🦊', '🐺', '🦁', '🐯', '🐼', '🐸', '🐙', '🦑', '🦐', '🦞', '🦀', '🐬', '🐳', '🦈', '🐋', '🦅', '🕊️', '🦉', '🦜', '🪶', '🎯', '🎲', '🎮', '🕹️', '🧩', '🧿', '🔮', '💎', '🪙', '🛰️', '🚀', '🛸', '⚙️', '⏳', '⌛', '🧭', '🗺️', '🎵', '🎶', '🎼', '🎸', '🎷', '🥁', '🎹', '🪕', '📻', '📺', '💡', '🕯️', '🧨', '🎇', '🎆'];
    const saltNumberToEmoji = (value) => {
      const text = normalize(value);
      if (!/^-\d+$/.test(text)) return '';
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) + text.charCodeAt(i)) >>> 0;
      return SALT_EMOJI_POOL[hash % SALT_EMOJI_POOL.length];
    };
    const replaceSaltMarkers = (value) => normalize(value)
      .replace(/<<\s*(-\d+)\s*>>/g, (_, salt) => ` ${saltNumberToEmoji(salt)} `)
      .replace(/<\s*(-\d+)\s*>/g, (_, salt) => ` ${saltNumberToEmoji(salt)} `);

const cleanDisplayText = (value, maxLength = 220) => {
      const sanitized = replaceSaltMarkers(decodeHtmlEntities(normalize(value))).replace(/[<>]/g, ' ');
      if (!Number.isFinite(maxLength) || maxLength <= 0) return sanitized;
      return sanitized.slice(0, maxLength);
    };
    const cleanAndCollapseWhitespace = (value, maxLength = 220) => cleanDisplayText(value, maxLength).replace(/\s+/g, ' ').trim();
    const normalizeKeywordKey = (value) => cleanDisplayText(normalize(value)).toLowerCase();
    const parseMetricNumber = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value.replace(/[,\s]/g, ''));
        if (Number.isFinite(parsed)) return parsed;
      }
      return Number.NaN;
    };
    const formatMetricCount = (value) => {
      if (!Number.isFinite(value) || value < 0) return '0';
      return Math.round(value).toLocaleString('en-US');
    };
    const formatTrendingResultCount = (value, cap = TRENDING_SEARCH_QTY) => {
      if (!Number.isFinite(value) || value < 0) return '0';
      const rounded = Math.round(value);
      if (rounded >= cap) return `${formatMetricCount(cap)}+`;
      return formatMetricCount(rounded);
    };
    const isInteractiveTouchTarget = (target) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest(INTERACTIVE_TOUCH_SELECTORS));
    };
    const shouldRenderCardImages = () => !window.matchMedia(MOBILE_CARD_IMAGE_MEDIA_QUERY).matches;
    const swipeTugReleaseMs = () => {
      const cssMs = window.getComputedStyle(dom.app).getPropertyValue('--swipe-tug-transition-ms').trim();
      const parsed = Number.parseFloat(cssMs);
      return Number.isFinite(parsed) ? parsed : 180;
    };
    const formatUtcDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    };
    const buildIpfsPathUrl = (hash, path, gatewayIndex = 0) => {
      const gateway = IPFS_GATEWAY_URLS[gatewayIndex] || IPFS_GATEWAY_URLS[0];
      const cleanPath = normalize(path);
      if (!cleanPath) return `${gateway}${hash}`;
      const encoded = cleanPath
        .split(/[\\/]+/)
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
      return `${gateway}${hash}/${encoded}`;
    };
    const waitingSymbolText = (message = '') => {
      const text = normalize(message).toLowerCase();
      if (text.includes('slow') || text.includes('network')) return '📶↓';
      if (text.includes('loading')) return '⏳▶';
      if (text.includes('buffer')) return '◌⏳';
      return '⏳';
    };
    const formatGatewayFallbackLabel = (nextIndex) => `backup IPFS gateway ${nextIndex + 1}/${IPFS_GATEWAY_URLS.length}`;
    const moveStatusToNewUrl = (oldUrl, nextUrl, fallbackStatus = 'downloading') => {
      if (!oldUrl || !nextUrl || oldUrl === nextUrl) return;
      const previousStatus = videoStatusByUrl.get(oldUrl);
      videoStatusByUrl.delete(oldUrl);
      videoStatusByUrl.set(nextUrl, previousStatus || fallbackStatus);
    };
    const tryNextIpfsGateway = (item) => {
      if (!item?.hash) return null;
      const currentIndex = Number.isInteger(item.gatewayIndex) ? item.gatewayIndex : 0;
      const oldUrl = item.url;

      if (item.originalPath && !item.triedPath) {
        item.triedPath = true;
        item.path = item.originalPath;
        const nextUrl = buildIpfsPathUrl(item.hash, item.path, currentIndex);
        item.url = nextUrl;
        return { oldUrl, nextUrl, nextIndex: currentIndex, isPathFallback: true };
      }

      if (currentIndex >= IPFS_GATEWAY_RETRY_LIMIT) return null;
      const nextIndex = currentIndex + 1;
      if (nextIndex >= IPFS_GATEWAY_URLS.length) return null;

      item.path = '';
      item.triedPath = false;
      const nextUrl = buildIpfsPathUrl(item.hash, item.path, nextIndex);
      item.gatewayIndex = nextIndex;
      item.url = nextUrl;
      return { oldUrl, nextUrl, nextIndex, isPathFallback: false };
    };
    const claimStreamRetry = (url) => {
      const cleanUrl = normalize(url);
      if (!cleanUrl) return false;
      const used = streamRetryCountByUrl.get(cleanUrl) || 0;
      if (used >= STREAM_RETRY_LIMIT) return false;
      streamRetryCountByUrl.set(cleanUrl, used + 1);
      return true;
    };
    const clearStreamRetry = (url) => {
      const cleanUrl = normalize(url);
      if (!cleanUrl) return;
      streamRetryCountByUrl.delete(cleanUrl);
    };
    const extractImageUrl = (messageText) => {
      const direct = messageText.match(IMAGE_URL_REGEX);
      if (direct) return direct[1];
      const ipfsImage = messageText.match(IPFS_IMAGE_REGEX);
      if (!ipfsImage || !ipfsImage[1]) return '';
      return buildIpfsPathUrl(ipfsImage[1], ipfsImage[2] || '');
    };
    const toTimestamp = (value) => {
      if (!value) return Number.NaN;
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? Number.NaN : time;
    };
    const unwrapQuotedText = (value) => normalize(value).replace(/^"|"$/g, '');
    const splitInlineIpfsSuffix = (value) => {
      const text = normalize(value);
      if (!text) return { primary: '', suffix: '' };
      const inlineIpfsIndex = text.search(/IPFS:(?:[a-zA-Z0-9]{59}|[a-zA-Z0-9]{46})/i);
      if (inlineIpfsIndex <= 0) return { primary: text, suffix: '' };
      return {
        primary: text.slice(0, inlineIpfsIndex),
        suffix: text.slice(inlineIpfsIndex)
      };
    };
    const stripTrailingUrlPunctuation = (value) => {
      let text = normalize(value);
      if (!text) return '';
      text = text.replace(URL_TRAILING_PUNCTUATION_REGEX, '');
      text = text.replace(/(?:(?:&(?:amp;)?(?:gt|lt);?)|[<>])+$/gi, '');
      while (text.endsWith(')')) {
        const openCount = (text.match(/\(/g) || []).length;
        const closeCount = (text.match(/\)/g) || []).length;
        if (closeCount <= openCount) break;
        text = text.slice(0, -1);
      }
      return text;
    };
    const normalizeLinkForHref = (value) => {
      const text = normalize(value);
      if (!text) return '';
      if (/^https?:\/\//i.test(text)) return text;
      if (/^www\./i.test(text)) return `https://${text}`;
      if (/^(?:[a-z0-9-]{1,}\.)+[a-z]{2,}(?:\/|$)/i.test(text)) return `https://${text}`;
      return text;
    };
    const formatLinkLabel = (value, max = 42) => {
      const text = cleanDisplayText(value || '');
      if (!text) return '';
      let display = text;
      try {
        const parsed = new URL(text);
        display = `${parsed.hostname.replace(/^www\./i, '')}${parsed.pathname === '/' ? '' : parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        display = text.replace(/^https?:\/\//i, '');
      }
      return display.length > max ? `${display.slice(0, max - 1)}…` : display;
    };
    const rootAddressCandidate = (root) => normalize(
      root?.FromAddress
      || root?.fromAddress
      || root?.['From Address']
      || root?.['from address']
      || root?.['Signed By']
      || root?.SignedBy
      || ''
    );
    const normalizeAddressForCompare = (value) => cleanDisplayText(value || '').trim();
    const sameAddressValue = (a, b) => {
      const left = normalizeAddressForCompare(a);
      const right = normalizeAddressForCompare(b);
      if (!left || !right) return false;
      if (left === right) return true;
      if (left.startsWith('0x') && right.startsWith('0x')) return left.toLowerCase() === right.toLowerCase();
      return false;
    };
    const extractProfileUrn = (profile) => cleanDisplayText(profile?.urn || profile?.URN || profile?.Urn || profile?.profileURN || profile?.ProfileURN || profile?.['@handle'] || '');
    const normalizeCreatorValue = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return normalizeAddressForCompare(value);
      if (typeof value === 'object') {
        return normalizeAddressForCompare(
          value.address
          || value.Address
          || value.creatorId
          || value.CreatorId
          || value.publicAddress
          || value.PublicAddress
          || ''
        );
      }
      return '';
    };
    const extractCreatorAddresses = (profile) => {
      if (!profile || typeof profile !== 'object') return [];
      const creators = profile.Creators || profile.creators || profile.CreatorAddresses || profile.creatorAddresses || [];
      const normalizedCreators = Array.isArray(creators)
        ? creators.map((creator) => normalizeCreatorValue(creator)).filter(Boolean)
        : [];
      if (normalizedCreators.length) return normalizedCreators;
      const creatorId = normalizeCreatorValue(profile.CreatorId || profile.creatorId || profile.Creator || profile.creator || profile.PublicAddress || profile.publicAddress || '');
      return creatorId ? [creatorId] : [];
    };
    const profileHasCreatorMatch = (profile, address) => {
      const creatorAddresses = extractCreatorAddresses(profile);
      if (!creatorAddresses.length) return false;
      return creatorAddresses.some((creatorAddress) => sameAddressValue(creatorAddress, address));
    };
    const profileDisplayName = (profile) => {
      if (!profile || typeof profile !== 'object') return '';
      const urn = cleanDisplayText(profile.urn || profile.URN || profile.Urn || profile['@handle'] || '');
      if (urn) return urn;
      const displayName = cleanDisplayText(profile.dnm || profile.DNM || profile.displayName || profile.DisplayName || '');
      if (displayName) return displayName;
      const fullName = [
        profile.fnm, profile.FNM, profile.firstName, profile.FirstName,
        profile.mnm, profile.MNM, profile.middleName, profile.MiddleName,
        profile.lnm, profile.LNM, profile.lastName, profile.LastName,
        profile.sfx, profile.SFX, profile.suffix, profile.Suffix
      ]
        .map((part) => cleanDisplayText(part || ''))
        .filter(Boolean)
        .join(' ');
      return cleanDisplayText(fullName);
    };
    const createSocialCard = ({ title, meta, body, imageUrl = '', links = [], keywords = [], createdAt = '', timestamp = Number.NaN, key = '' }) => ({
      title,
      meta,
      body,
      imageUrl,
      links,
      keywords,
      createdAt,
      timestamp,
      key
    });
    const shortTitle = (value, max = 28) => {
      const text = cleanDisplayText(value || '');
      return text.length > max ? `${text.slice(0, max - 1)}…` : text;
    };
    const extractLinks = (value) => {
      const text = normalize(value);
      if (!text) return [];
      LINK_OR_IPFS_TOKEN_REGEX.lastIndex = 0;
      const extracted = [];
      let match;
      while ((match = LINK_OR_IPFS_TOKEN_REGEX.exec(text)) !== null) {
        const token = match[0] || '';
        if (!token) continue;
        const ipfsParts = token.match(IPFS_TOKEN_PARSER_REGEX);
        if (ipfsParts) {
          const hash = normalize(ipfsParts[1] || '');
          if (!hash) continue;
          extracted.push(buildIpfsPathUrl(hash, '', 0));
          continue;
        }
        const cleanUrl = normalizeLinkForHref(stripTrailingUrlPunctuation(splitInlineIpfsSuffix(token).primary || token));
        if (cleanUrl) extracted.push(cleanUrl);
      }
      const unique = [...new Set(extracted)];
      return unique.slice(0, 4);
    };
    const extractKeywords = (messageText, subjectText) => {
      const keywords = [];
      const pushKeyword = (raw) => {
        const keyword = normalize(raw).replace(/^#/, '').toLowerCase();
        // Keep this guard for fallback non-hashtag tokens as well as hashtag matches.
        if (!keyword || keyword.length < 2 || keywords.includes(keyword)) return;
        keywords.push(keyword);
      };
      for (const source of [subjectText, messageText]) {
        for (const match of source.matchAll(KEYWORD_REGEX)) pushKeyword(match[1]);
      }
      if (!keywords.length) {
        for (const token of `${subjectText} ${messageText}`.split(/[^a-zA-Z0-9_-]+/)) {
          if (token.length < 3) continue;
          pushKeyword(token);
          if (keywords.length >= 4) break;
        }
      }
      return keywords.slice(0, 5);
    };
    const COMPOSER_CID_REGEX = /(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[0-9a-z]{40,})/;
    const UNSAFE_FILENAME_CHARS_REGEX = /[<>:"/\\|?*\u0000-\u001f]/g;
    const VIDEO_FILE_EXTENSION_REGEX = /\.(mp4|webm|ogv|mov|avi|m3u8)$/i;
    const IPFS_PATH_URL_REGEX = /\/ipfs\/([^/?#]+)(?:\/([^?#]+))?/i;
    const IPFS_VIDEO_PROBE_TIMEOUT_MS = 11000;
    const BTC_DECIMAL_PRECISION = 8;
    const PROFILE_IMAGE_GATEWAY_VARIANT_MULTIPLIER = 6;
    // Cap fallback attempts to keep profile-card image retries bounded across payloads with many
    // invalid or non-image string values that can otherwise trigger excessive failed image loads.
    // Allow room for multiple image-like fields (direct + nested profile values) expanded across all
    // configured IPFS gateways, with a floor of 12 so small gateway lists still get broad fallback coverage.
    const PROFILE_IMAGE_MAX_CANDIDATE_URLS = Math.max(IPFS_GATEWAY_URLS.length * PROFILE_IMAGE_GATEWAY_VARIANT_MULTIPLIER, 12);
    const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const SIGNING_DELIMITERS = ['\\', '/', ':', '*', '?', '"', '|'];
    const MAX_URI_DECODE_ITERATIONS = 3; // Limits successive URI decoding iterations to unwrap percent-encoded IPFS links.
    const MEDIA_QUERY_PARAM_NAMES = [
      'filename', 'file', 'name', 'path', 'download', 'media', 'animation_url', 'animation',
      'video', 'img', 'image', 'uri', 'url', 'artifact_uri', 'artifact', 'display_uri', 'display'
    ];

    function setComposeStatus(message) {
      if (!dom.composeStatus) return;
      dom.composeStatus.textContent = cleanDisplayText(message || '', 240);
    }

    function decodeUriComponentSafely(value) {
      const text = normalize(value);
      if (!text) return '';
      try {
        return decodeURIComponent(text);
      } catch {
        return text;
      }
    }

    function collectDecodedStringVariants(value) {
      const variants = [];
      let current = normalize(value);
      let remainingDecodes = MAX_URI_DECODE_ITERATIONS;
      while (remainingDecodes > 0 && current) {
        variants.push(current);
        const next = decodeUriComponentSafely(current);
        if (!next || next === current) break;
        current = next;
        remainingDecodes -= 1;
      }
      return [...new Set(variants)];
    }

    function extractMediaPathFromUrlParts(parsed) {
      if (!(parsed instanceof URL)) return '';
      for (const key of MEDIA_QUERY_PARAM_NAMES) {
        const exactValue = normalize(parsed.searchParams.get(key) || '');
        if (exactValue) {
          const decoded = decodeUriComponentSafely(exactValue).replace(/^\/+/, '');
          const nestedIpfsPath = decoded.match(/ipfs:\/\/(?:ipfs\/)?[^/?#]+\/([^?#]+)/i)?.[1]
            || decoded.match(/\/ipfs\/[^/?#]+\/([^?#]+)/i)?.[1]
            || '';
          if (nestedIpfsPath) return nestedIpfsPath.replace(/^\/+/, '');
          if (decoded && !COMPOSER_CID_REGEX.test(decoded)) return decoded;
        }
      }
      const hash = normalize(parsed.hash || '').replace(/^#/, '');
      for (const variant of collectDecodedStringVariants(hash)) {
        const tokenMatch = variant.match(/(?:^|[/?#=&])(filename|file|name|path)=([^&#]+)/i);
        if (tokenMatch?.[2]) return decodeUriComponentSafely(tokenMatch[2]).replace(/^\/+/, '');
      }
      return '';
    }

    function buildLooseCidPathResult(cidRaw, pathRaw = '') {
      const cid = normalize(cidRaw || '');
      if (!COMPOSER_CID_REGEX.test(cid)) return null;
      let path = normalize(pathRaw || '');
      if (/^ipfs[:/]/i.test(path)) {
        const nested = extractIpfsPartsFromInput(path);
        if (nested?.cid) return nested;
      }
      path = decodeUriComponentSafely(path).replace(/^\/+/, '');
      if (path && COMPOSER_CID_REGEX.test(path)) path = '';
      return { cid, path };
    }

    function extractLooseIpfsPartsFromText(value) {
      for (const variant of collectDecodedStringVariants(value)) {
        if (!variant) continue;
        const ipfsSchemeBody = variant.match(/ipfs:\/\/(?:ipfs\/)?([^?#]+)/i);
        if (ipfsSchemeBody?.[1]) {
          const ipfsLike = buildLooseCidPathResult(...(() => {
            const [cidRaw, ...pathParts] = ipfsSchemeBody[1].split(/[\\/]+/).filter(Boolean);
            return [cidRaw, pathParts.join('/')];
          })());
          if (ipfsLike?.cid) return ipfsLike;
        }
        const cidWithPath = variant.match(new RegExp(`${COMPOSER_CID_REGEX.source}(?:[\\\\/]+([^?#<>"'\\s]+))?`, 'i'));
        if (cidWithPath?.[1]) {
          let path = normalize(cidWithPath[2] || '');
          if (!path) {
            try {
              path = extractMediaPathFromUrlParts(new URL(variant));
            } catch {}
          }
          const loose = buildLooseCidPathResult(cidWithPath[1], path);
          if (loose?.cid) return loose;
        }
      }
      return null;
    }

    function setSendEstimate(message) {
      if (!dom.sendEstimate) return;
      dom.sendEstimate.textContent = cleanDisplayText(message || '', 220);
    }

    function clearComposerProfileCard() {
      if (!dom.composeProfileCard || !dom.composeProfileTitle || !dom.composeProfileMeta) return;
      dom.composeProfileCard.classList.remove('visible');
      dom.composeProfileTitle.textContent = '';
      dom.composeProfileMeta.textContent = '';
      if (dom.composeProfileExtra) dom.composeProfileExtra.textContent = '';
      composeProfileAvatarCandidateUrls = [];
      composeProfileAvatarCandidateIndex = 0;
      if (dom.composeProfileAvatar) {
        dom.composeProfileAvatar.classList.remove('visible');
        dom.composeProfileAvatar.removeAttribute('src');
      }
      if (dom.composeProfileAddrRow) dom.composeProfileAddrRow.style.display = 'none';
      if (dom.composeProfileAddrText) dom.composeProfileAddrText.textContent = '';
      walletBalanceState = null;
      walletBalanceExpanded = false;
      if (dom.walletBalance) dom.walletBalance.textContent = '';
    }

    function formatBtcAndSat(valueSat) {
      const sat = Number(valueSat || 0);
      return `${(sat / 1e8).toFixed(BTC_DECIMAL_PRECISION)} BTC (${sat.toLocaleString()} sat)`;
    }

    function renderWalletBalance() {
      if (!dom.walletBalance) return;
      dom.walletBalance.textContent = '';
      if (!walletBalanceState) return;
      if (walletBalanceState.kind === 'message') {
        dom.walletBalance.textContent = cleanDisplayText(walletBalanceState.message || '', 220);
        return;
      }

      const summaryBtn = document.createElement('button');
      summaryBtn.type = 'button';
      summaryBtn.className = `compose-wallet-summary-btn${walletBalanceState.pendingSat > 0 ? ' pending' : ''}`;
      summaryBtn.setAttribute('aria-expanded', walletBalanceExpanded ? 'true' : 'false');
      const summaryText = document.createElement('span');
      summaryText.textContent = `Total: ${(Number(walletBalanceState.totalSat || 0) / 1e8).toFixed(BTC_DECIMAL_PRECISION)} BTC`;
      const chevron = document.createElement('span');
      chevron.className = 'compose-wallet-summary-chevron';
      chevron.textContent = walletBalanceExpanded ? '▾' : '▸';
      summaryBtn.append(summaryText, chevron);
      summaryBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        walletBalanceExpanded = !walletBalanceExpanded;
        renderWalletBalance();
      });
      dom.walletBalance.appendChild(summaryBtn);
      if (!walletBalanceExpanded) return;

      const details = document.createElement('div');
      details.className = 'compose-wallet-details';
      const addRow = (label, value, pending = false) => {
        const row = document.createElement('div');
        row.className = `compose-wallet-detail-row${pending ? ' pending' : ''}`;
        const key = document.createElement('strong');
        key.textContent = label;
        const data = document.createElement('span');
        data.textContent = value;
        row.append(key, data);
        details.appendChild(row);
      };

      addRow('Total', formatBtcAndSat(walletBalanceState.totalSat));
      if (typeof walletBalanceState.unconsolidatedSat === 'number') {
        addRow('Unconsolidated', formatBtcAndSat(walletBalanceState.unconsolidatedSat));
      } else {
        addRow('Unconsolidated', 'Unlock wallet to calculate');
      }
      addRow('Pending', formatBtcAndSat(walletBalanceState.pendingSat), walletBalanceState.pendingSat > 0);
      dom.walletBalance.appendChild(details);
    }

    function setWalletBalanceText(message) {
      walletBalanceState = { kind: 'message', message };
      renderWalletBalance();
    }

    function hasP2fkDelimiterNumberPair(value) {
      return /[\\/:*?"|<>][0-9]/.test(cleanDisplayText(value || '', 120));
    }

    async function getAddressBalanceStats(address) {
      const cleanAddress = cleanDisplayText(address || '');
      if (!cleanAddress) return { confirmedSat: 0, unconfirmedSat: 0, txCount: 0, utxoCount: 0 };
      const response = await fetch(`${MEMPOOL_TESTNET_API}/address/${encodeURIComponent(cleanAddress)}`);
      if (!response.ok) throw new Error(`Balance lookup failed (${response.status})`);
      const payload = await response.json();
      const chainStats = payload?.chain_stats || {};
      const mempoolStats = payload?.mempool_stats || {};
      const confirmedSat = (Number(chainStats.funded_txo_sum || 0) - Number(chainStats.spent_txo_sum || 0));
      const unconfirmedSat = (Number(mempoolStats.funded_txo_sum || 0) - Number(mempoolStats.spent_txo_sum || 0));
      const txCount = Number(chainStats.tx_count || 0) + Number(mempoolStats.tx_count || 0);
      const utxoCount = (Number(chainStats.funded_txo_count || 0) - Number(chainStats.spent_txo_count || 0)) + (Number(mempoolStats.funded_txo_count || 0) - Number(mempoolStats.spent_txo_count || 0));
      return { confirmedSat, unconfirmedSat, txCount, utxoCount };
    }

    async function refreshWalletBalance() {
      const address = cleanDisplayText(walletSession.address || '');
      if (!address) {
        walletBalanceExpanded = false;
        walletBalanceState = null;
        setWalletBalanceText('');
        return;
      }
      setWalletBalanceText('Checking main + unconsolidated balances…');
      try {
        const mainStats = await getAddressBalanceStats(address);
        let unconsolidatedSat = null;
        let unconsolidatedPendingSat = 0;
        if (internalPrivKeyBytes) {
          const keyring = await buildInternalWalletKeyring(internalPrivKeyBytes);
          const changeEntries = await Promise.all(
            keyring.changeSigners.map(async (signer) => ({ signer, stats: await getAddressBalanceStats(signer.address) }))
          );
          unconsolidatedSat = changeEntries.reduce((sum, entry) => sum + Number(entry.stats.confirmedSat || 0), 0);
          unconsolidatedPendingSat = changeEntries.reduce((sum, entry) => sum + Number(entry.stats.unconfirmedSat || 0), 0);
        }
        walletBalanceState = {
          kind: 'totals',
          totalSat: Number(mainStats.confirmedSat || 0) + Number(unconsolidatedSat || 0),
          unconsolidatedSat,
          pendingSat: Number(mainStats.unconfirmedSat || 0) + Number(unconsolidatedPendingSat || 0)
        };
        renderWalletBalance();
      } catch (error) {
        setWalletBalanceText(error?.message || 'Could not load wallet balance');
      }
    }

    function normalizeProfileImageCandidate(value) {
      const raw = cleanDisplayText(unwrapQuotedText(value || ''), 300);
      if (!raw) return '';
      return raw.replace(/\\+/g, '/');
    }

    function scanNestedProfileImageStrings(value, collected = [], seen = new WeakSet()) {
      if (typeof value === 'string') {
        const normalized = normalizeProfileImageCandidate(value);
        if (normalized) collected.push(normalized);
        return collected;
      }
      if (!value || typeof value !== 'object') return collected;
      if (seen.has(value)) return collected;
      seen.add(value);
      const entries = Array.isArray(value) ? value : Object.values(value);
      for (const entry of entries) scanNestedProfileImageStrings(entry, collected, seen);
      return collected;
    }

    function profileImageCandidateUrlsFromProfile(profile) {
      if (!profile || typeof profile !== 'object') return [];
      const directCandidates = [
        profile.img, profile.IMG, profile.image, profile.Image, profile.imageUrl, profile.ImageUrl,
        profile.avatar, profile.Avatar, profile.pfp, profile.PFP, profile.photo, profile.Photo,
        profile.ProfileImage, profile.profileImage, profile.profileImageUrl, profile.ProfileImageUrl
      ];
      const rawCandidates = [
        ...directCandidates.map((candidate) => normalizeProfileImageCandidate(candidate)).filter(Boolean),
        ...scanNestedProfileImageStrings(profile)
      ];
      const urls = [];
      for (const raw of [...new Set(rawCandidates)]) {
        if (!raw) continue;
        const parsed = extractIpfsPartsFromInput(raw);
        if (parsed?.cid) {
          for (let gatewayIndex = 0; gatewayIndex < IPFS_GATEWAY_URLS.length; gatewayIndex += 1) {
            urls.push(buildIpfsPathUrl(parsed.cid, '', gatewayIndex));
          }
          if (parsed.path) {
            for (let gatewayIndex = 0; gatewayIndex < IPFS_GATEWAY_URLS.length; gatewayIndex += 1) {
              urls.push(buildIpfsPathUrl(parsed.cid, parsed.path, gatewayIndex));
            }
          }
          continue;
        }
        if (/^https?:\/\//i.test(raw)) urls.push(raw);
      }
      return [...new Set(urls)].slice(0, PROFILE_IMAGE_MAX_CANDIDATE_URLS);
    }

    function profileImageCandidateUrlsFromProfiles(...profiles) {
      const urls = [];
      for (const profile of profiles) {
        urls.push(...profileImageCandidateUrlsFromProfile(profile));
        if (urls.length >= PROFILE_IMAGE_MAX_CANDIDATE_URLS) break;
      }
      return [...new Set(urls)].slice(0, PROFILE_IMAGE_MAX_CANDIDATE_URLS);
    }

    function applyComposeProfileAvatarCandidate() {
      if (!dom.composeProfileAvatar) return;
      // Keep avatar hidden until a candidate successfully loads and emits "load".
      dom.composeProfileAvatar.classList.remove('visible');
      if (
        composeProfileAvatarCandidateIndex < 0
        || composeProfileAvatarCandidateIndex >= composeProfileAvatarCandidateUrls.length
      ) {
        dom.composeProfileAvatar.removeAttribute('src');
        return;
      }
      const nextUrl = composeProfileAvatarCandidateUrls[composeProfileAvatarCandidateIndex];
      dom.composeProfileAvatar.src = nextUrl;
    }

    function setComposeProfileAvatarCandidates(urls) {
      composeProfileAvatarCandidateUrls = Array.isArray(urls)
        ? urls.map((url) => normalize(url)).filter(Boolean)
        : [];
      composeProfileAvatarCandidateIndex = 0;
      applyComposeProfileAvatarCandidate();
    }

    function advanceComposeProfileAvatarCandidate() {
      if (composeProfileAvatarCandidateIndex >= composeProfileAvatarCandidateUrls.length - 1) {
        composeProfileAvatarCandidateIndex = -1;
        applyComposeProfileAvatarCandidate();
        return;
      }
      composeProfileAvatarCandidateIndex += 1;
      applyComposeProfileAvatarCandidate();
    }

    async function refreshComposerProfileCard() {
      const address = cleanDisplayText(walletSession.address || '');
      if (!address) {
        clearComposerProfileCard();
        return;
      }
      if (!dom.composeProfileCard || !dom.composeProfileTitle || !dom.composeProfileMeta) return;
      dom.composeProfileCard.classList.add('visible');
      dom.composeProfileTitle.textContent = shortTitle(address, 48);
      dom.composeProfileMeta.textContent = 'Looking up p2fk profile…';
      // Always show address + copy button at the bottom of the profile card
      if (dom.composeProfileAddrRow) dom.composeProfileAddrRow.style.display = 'flex';
      if (dom.composeProfileAddrText) dom.composeProfileAddrText.textContent = address;
      try {
        const byAddress = await getProfileByAddress(address);
        const urn = extractProfileUrn(byAddress);
        let resolvedProfile = byAddress;
        if (urn) {
          const byUrn = await getProfileByURN(urn);
          if (byUrn && profileHasCreatorMatch(byUrn, address)) resolvedProfile = byUrn;
        }
        const title = profileDisplayName(resolvedProfile) || shortTitle(address, 48);
        const profileUrn = cleanDisplayText(extractProfileUrn(resolvedProfile), 120);
        const imageUrls = profileImageCandidateUrlsFromProfiles(resolvedProfile, byAddress);
        const bio = cleanAndCollapseWhitespace(
          resolvedProfile?.bio || resolvedProfile?.Bio || resolvedProfile?.description || resolvedProfile?.Description || '',
          260
        );
        const hometown = cleanAndCollapseWhitespace(
          resolvedProfile?.loc || resolvedProfile?.LOC || resolvedProfile?.location || resolvedProfile?.Location || '',
          90
        );
        dom.composeProfileTitle.textContent = title;
        const displayUrn = profileUrn ? `@${profileUrn}` : 'No profile URN';
        dom.composeProfileMeta.textContent = displayUrn === title
          ? (bio || displayUrn)
          : `${displayUrn}${bio ? ` · ${bio}` : ''}`;
        if (dom.composeProfileExtra) {
          const pieces = [];
          if (hometown) pieces.push(`Location: ${hometown}`);
          if (resolvedProfile?.website || resolvedProfile?.Website) {
            pieces.push(cleanAndCollapseWhitespace(resolvedProfile.website || resolvedProfile.Website, 80));
          }
          dom.composeProfileExtra.textContent = pieces.join(' · ');
        }
        if (dom.composeProfileAvatar) {
          setComposeProfileAvatarCandidates(imageUrls);
        }
      } catch {
        dom.composeProfileTitle.textContent = shortTitle(address, 30);
        dom.composeProfileMeta.textContent = 'No profile found';
        if (dom.composeProfileExtra) dom.composeProfileExtra.textContent = '';
        if (dom.composeProfileAvatar) {
          setComposeProfileAvatarCandidates([]);
        }
      }
    }

    async function refreshComposerSendEstimate() {
      const requestId = ++composeEstimateRequestId;
      const messageText = normalize(dom.postMessage?.value || '');
      if (!walletSession.address || !internalPrivKeyBytes) {
        setSendEstimate('Unlock/import wallet to calculate sendmany cost estimate.');
        return;
      }
      if (!composerAttachments.length) {
        setSendEstimate('* Add an IPFS video attachment to see cost estimates.');
        return;
      }
      try {
        const { outputs, cost } = await buildP2fkRecipientsAndCost({
          messageText,
          attachments: composerAttachments,
          extraRecipients: [],
          fromAddress: walletSession.address,
          amountPerRecipient: COMPOSER_AMOUNT_PER_RECIPIENT
        });
        if (requestId !== composeEstimateRequestId) return;
        const costSats = Math.round(cost * 1e8);
        setSendEstimate(`${outputs.length} outputs · ${cost.toFixed(BTC_DECIMAL_PRECISION)} BTC (${costSats.toLocaleString()} sat) + miner fee`);
      } catch (error) {
        if (requestId !== composeEstimateRequestId) return;
        setSendEstimate(error?.message || 'Cost estimate unavailable');
      }
    }

    function queueComposerSendEstimateRefresh() {
      if (composeEstimateRefreshTimer) clearTimeout(composeEstimateRefreshTimer);
      composeEstimateRefreshTimer = setTimeout(() => {
        composeEstimateRefreshTimer = null;
        refreshComposerSendEstimate();
      }, 220);
    }

    function syncComposerWalletContext() {
      refreshWalletBalance();
      refreshComposerProfileCard();
      queueComposerSendEstimateRefresh();
    }

    function populateWalletProviderOptions() {
      walletSession.providerId = INTERNAL_WALLET_ID;
    }

    function setComposePanelOpen(open) {
      composePanelOpen = Boolean(open);
      if (!dom.composePanel) return;
      dom.composePanel.classList.toggle('visible', composePanelOpen);
      dom.composePanel.setAttribute('aria-hidden', composePanelOpen ? 'false' : 'true');
      if (composePanelOpen) {
        syncComposerWalletContext();
      } else {
        setComposeStatus('');
        if (!composerAttachments.length) clearComposerPreview();
      }
    }

    function toggleComposePanel() {
      setComposePanelOpen(!composePanelOpen);
      if (composePanelOpen) closeBannerMenu();
    }

    function pickRandomDelimiter() {
      const bytes = new Uint8Array(1);
      const limit = Math.floor(256 / SIGNING_DELIMITERS.length) * SIGNING_DELIMITERS.length;
      let value = 0;
      do {
        crypto.getRandomValues(bytes);
        value = bytes[0];
      } while (value >= limit);
      return SIGNING_DELIMITERS[value % SIGNING_DELIMITERS.length];
    }

    function createNegativeSalt() {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return -(bytes[0] % 100000);
    }

    function parseHashtagKeywords(message) {
      const matches = normalize(message).match(/#[^\s]{1,20}/g) || [];
      return [...new Set(matches.map((token) => token.slice(1).trim()).filter(Boolean))];
    }

    function sanitizeP2fkMessageText(message) {
      return decodeHtmlEntities(normalize(message)).replace(/[<>]/g, ' ');
    }

    function parseManualRecipients(rawText) {
      return normalize(rawText)
        .replace(/\s+/g, '')
        .split(/[;,]/)
        .map((address) => address.trim())
        .filter(Boolean);
    }

    async function sha256Bytes(bytes) {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return new Uint8Array(digest);
    }

    async function sha256HexFromText(text) {
      const bytes = new TextEncoder().encode(text);
      const digest = await sha256Bytes(bytes);
      return Array.from(digest).map((value) => value.toString(16).padStart(2, '0')).join('');
    }

    function encodeBitcoinVarInt(value) {
      if (value < 0xfd) return new Uint8Array([value]);
      if (value <= 0xffff) return new Uint8Array([0xfd, value & 0xff, (value >> 8) & 0xff]);
      if (value <= 0xffffffff) {
        return new Uint8Array([0xfe, value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff]);
      }
      throw new Error('Message is too large to sign');
    }

    async function hashBitcoinSignedMessage(messageText) {
      const magic = new TextEncoder().encode('Bitcoin Signed Message:\n');
      const msg = new TextEncoder().encode(messageText);
      const msgLen = encodeBitcoinVarInt(msg.length);
      const envelope = new Uint8Array(1 + magic.length + msgLen.length + msg.length);
      envelope[0] = magic.length;
      envelope.set(magic, 1);
      envelope.set(msgLen, 1 + magic.length);
      envelope.set(msg, 1 + magic.length + msgLen.length);
      return sha256Bytes(await sha256Bytes(envelope));
    }

    function encodeBase58(bytes) {
      if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
      let zeros = 0;
      while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
      let value = 0n;
      for (const byte of bytes) value = (value << 8n) + BigInt(byte);
      let encoded = '';
      while (value > 0n) {
        const remainder = Number(value % 58n);
        value /= 58n;
        encoded = BASE58_ALPHABET[remainder] + encoded;
      }
      return `${BASE58_ALPHABET[0].repeat(zeros)}${encoded || (zeros ? '' : BASE58_ALPHABET[0])}`;
    }

    async function encodeBase58Check(bytes) {
      const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const first = await sha256Bytes(payload);
      const second = await sha256Bytes(first);
      const out = new Uint8Array(payload.length + 4);
      out.set(payload, 0);
      out.set(second.slice(0, 4), payload.length);
      return encodeBase58(out);
    }

    // ── Inline crypto: secp256k1 + RIPEMD-160 + Bitcoin raw-tx builder ────────

    function bytesToBigInt(bytes) {
      let v = 0n;
      for (const b of bytes) v = (v << 8n) | BigInt(b);
      return v;
    }

    function bigIntToBytes32(n) {
      const out = new Uint8Array(32);
      for (let i = 31; i >= 0; i--) { out[i] = Number(n & 0xffn); n >>= 8n; }
      return out;
    }

    function bytesToHex(bytes) {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function hexToBytes(hex) {
      const b = new Uint8Array(hex.length / 2);
      for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return b;
    }

    // secp256k1 Jacobian arithmetic
    const SECP_P  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn; // secp256k1 field prime p
    const SECP_N  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n; // secp256k1 subgroup order n
    const SECP_Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n; // generator point x
    const SECP_Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n; // generator point y

    function sModP(n) { return ((n % SECP_P) + SECP_P) % SECP_P; }
    function sModN(n) { return ((n % SECP_N) + SECP_N) % SECP_N; }
    function sInv(a, m) {
      let [r, s, rr, ss] = [m, 0n, ((a % m) + m) % m, 1n];
      while (rr !== 0n) { const q = r / rr; [r, s, rr, ss] = [rr, ss, r - q * rr, s - q * ss]; }
      return ((s % m) + m) % m;
    }

    function japDouble(X, Y, Z) {
      if (Y === 0n) return [0n, 1n, 0n];
      const Y2 = sModP(Y * Y), S = sModP(4n * X * Y2), M = sModP(3n * X * X);
      const X2 = sModP(M * M - 2n * S);
      return [X2, sModP(M * (S - X2) - 8n * Y2 * Y2), sModP(2n * Y * Z)];
    }

    function japAdd(X1, Y1, Z1, X2, Y2, Z2) {
      if (Z1 === 0n) return [X2, Y2, Z2];
      if (Z2 === 0n) return [X1, Y1, Z1];
      const z1s = sModP(Z1 * Z1), z2s = sModP(Z2 * Z2);
      const U1 = sModP(X1 * z2s), U2 = sModP(X2 * z1s);
      const S1 = sModP(Y1 * z2s * Z2), S2 = sModP(Y2 * z1s * Z1);
      const H = sModP(U2 - U1), R = sModP(S2 - S1);
      if (H === 0n) return R === 0n ? japDouble(X1, Y1, Z1) : [0n, 1n, 0n];
      const Hs = sModP(H * H), Hc = sModP(H * Hs);
      const X3 = sModP(R * R - Hc - 2n * U1 * Hs);
      return [X3, sModP(R * (U1 * Hs - X3) - S1 * Hc), sModP(H * Z1 * Z2)];
    }

    function japToAff(X, Y, Z) {
      const zi = sInv(Z, SECP_P), zi2 = sModP(zi * zi);
      return [sModP(X * zi2), sModP(Y * sModP(zi2 * zi))];
    }

    function sMul(k) {
      let [rx, ry, rz] = [0n, 1n, 0n], [ax, ay, az] = [SECP_Gx, SECP_Gy, 1n];
      let s = ((k % SECP_N) + SECP_N) % SECP_N;
      while (s > 0n) {
        if (s & 1n) [rx, ry, rz] = japAdd(rx, ry, rz, ax, ay, az);
        [ax, ay, az] = japDouble(ax, ay, az);
        s >>= 1n;
      }
      return [rx, ry, rz];
    }

    function secPrivToPub(privBytes) {
      const [jx, jy, jz] = sMul(bytesToBigInt(privBytes));
      const [x, y] = japToAff(jx, jy, jz);
      return new Uint8Array([(y & 1n) ? 0x03 : 0x02, ...bigIntToBytes32(x)]);
    }

    async function rfc6979k(privBytes, msgHash) {
      const hmac = async (K, ...parts) => {
        const ck = await crypto.subtle.importKey('raw', K, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        let len = 0;
        for (const p of parts) len += p.length;
        const buf = new Uint8Array(len);
        let off = 0;
        for (const p of parts) { buf.set(p, off); off += p.length; }
        return new Uint8Array(await crypto.subtle.sign('HMAC', ck, buf));
      };
      let V = new Uint8Array(32).fill(1), K = new Uint8Array(32).fill(0);
      K = await hmac(K, V, new Uint8Array([0]), privBytes, msgHash);
      V = await hmac(K, V);
      K = await hmac(K, V, new Uint8Array([1]), privBytes, msgHash);
      V = await hmac(K, V);
      for (;;) {
        V = await hmac(K, V);
        const k = bytesToBigInt(V);
        if (k >= 1n && k < SECP_N) return k;
        K = await hmac(K, V, new Uint8Array([0]));
        V = await hmac(K, V);
      }
    }

    async function ecSign(privBytes, msgHashBytes) {
      const d = bytesToBigInt(privBytes), z = bytesToBigInt(msgHashBytes);
      const k = await rfc6979k(privBytes, msgHashBytes);
      const [rx, ry] = japToAff(...sMul(k));
      const r = sModN(rx);
      let s = sModN(sInv(k, SECP_N) * (z + r * d));
      // recoveryId bit-0 = parity of R.y; bit-1 = whether rx overflowed n (extremely rare on secp256k1)
      let recoveryId = Number(ry & 1n) | (rx >= SECP_N ? 2 : 0);
      if (s > SECP_N / 2n) { s = SECP_N - s; recoveryId ^= 1; } // BIP-62 low-S
      return { r, s, recoveryId };
    }

    // ASN.1 DER encoding for ECDSA signatures (Bitcoin legacy scriptSig format)
    function derEncode(r, s) {
      const mb = (n) => { const b = []; let t = n; while (t > 0n) { b.unshift(Number(t & 0xffn)); t >>= 8n; } if (b[0] & 0x80) b.unshift(0); return b; };
      const rb = mb(r), sb = mb(s);
      return new Uint8Array([0x30, rb.length + sb.length + 4, 0x02, rb.length, ...rb, 0x02, sb.length, ...sb]);
    }

    // RIPEMD-160 — pure JS
    function ripemd160(data) {
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
      const rl32 = (x, n) => (x << n) | (x >>> (32 - n));
      const ff = (j, x, y, z) => j < 16 ? x ^ y ^ z : j < 32 ? (x & y) | (~x & z) : j < 48 ? (x | ~y) ^ z : j < 64 ? (x & z) | (y & ~z) : x ^ (y | ~z);
      const KL = [0, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
      const KR = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0];
      // RIPEMD-160 message word schedules (RL/RR) and per-round rotation counts (SL/SR)
      /* eslint-disable no-multi-spaces */
      const RL = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15, 7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8, 3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12, 1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2, 4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
      const RR = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12, 6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2, 15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13, 8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14, 12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
      const SL = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8, 7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12, 11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5, 11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12, 9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
      const SR = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6, 9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11, 9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5, 15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8, 8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
      /* eslint-enable no-multi-spaces */
      const mlen = bytes.length;
      const padLen = mlen % 64 < 56 ? 56 - (mlen % 64) : 120 - (mlen % 64);
      const padded = new Uint8Array(mlen + padLen + 8);
      padded.set(bytes);
      padded[mlen] = 0x80;
      const bl = mlen * 8;
      for (let i = 0; i < 4; i++) padded[mlen + padLen + i] = (bl >>> (i * 8)) & 0xff;
      const view = new DataView(padded.buffer);
      let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
      for (let off = 0; off < padded.length; off += 64) {
        const X = Array.from({ length: 16 }, (_, i) => view.getUint32(off + i * 4, true));
        let al = h0, bl2 = h1, cl = h2, dl = h3, el = h4;
        let ar = h0, br = h1, cr = h2, dr = h3, er = h4;
        for (let j = 0; j < 80; j++) {
          const qi = j >> 4;
          let T = (rl32((al + ff(j, bl2, cl, dl) + X[RL[j]] + KL[qi]) | 0, SL[j]) + el) | 0;
          al = el; el = dl; dl = rl32(cl, 10); cl = bl2; bl2 = T;
          T = (rl32((ar + ff(79 - j, br, cr, dr) + X[RR[j]] + KR[qi]) | 0, SR[j]) + er) | 0;
          ar = er; er = dr; dr = rl32(cr, 10); cr = br; br = T;
        }
        const T = (h1 + cl + dr) | 0;
        h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0;
        h3 = (h4 + al + br) | 0; h4 = (h0 + bl2 + cr) | 0; h0 = T;
      }
      const out = new Uint8Array(20);
      const dv = new DataView(out.buffer);
      [h0, h1, h2, h3, h4].forEach((h, i) => dv.setUint32(i * 4, h, true));
      return out;
    }

    // Base58 decode (inverse of existing encodeBase58)
    function decodeBase58(str) {
      let n = 0n;
      for (const c of str) {
        const idx = BASE58_ALPHABET.indexOf(c);
        if (idx < 0) throw new Error(`Invalid Base58 char: ${c}`);
        n = n * 58n + BigInt(idx);
      }
      let zeros = 0;
      for (const c of str) { if (c !== BASE58_ALPHABET[0]) break; zeros++; }
      const out = [];
      while (n > 0n) { out.unshift(Number(n & 0xffn)); n >>= 8n; }
      return new Uint8Array([...new Array(zeros).fill(0), ...out]);
    }

    async function decodeBase58Check(str) {
      const raw = decodeBase58(str);
      if (raw.length < 5) throw new Error('Base58Check too short');
      const payload = raw.slice(0, -4), chk = raw.slice(-4);
      const h2 = await sha256Bytes(await sha256Bytes(payload));
      for (let i = 0; i < 4; i++) if (chk[i] !== h2[i]) throw new Error('Invalid Base58Check checksum');
      return payload;
    }

    async function wifToPrivKeyBytes(wif) {
      const p = await decodeBase58Check(normalize(wif));
      // testnet3 uses 0xef for WIF-encoded private keys (distinct from 0x6f address version byte).
      if (p[0] !== 0xef) throw new Error(`Only testnet3 WIF-encoded private keys are supported (expected WIF version byte 0xef, received 0x${p[0].toString(16)})`);
      if (p.length === 34) return p.slice(1, 33); // compressed WIF payload: version + 32-byte key + 0x01
      if (p.length === 33) return p.slice(1);     // uncompressed WIF payload: version + 32-byte key
      throw new Error('WIF key has unexpected length');
    }

    async function privKeyToTestnetWif(privBytes) {
      // Compressed WIF: version byte 0xef + 32-byte key + 0x01 compression flag
      const wifBytes = new Uint8Array(34);
      wifBytes[0] = 0xef;
      wifBytes.set(privBytes, 1);
      wifBytes[33] = 0x01;
      return encodeBase58Check(wifBytes);
    }


    async function onConsolidateForMessaging() {
      if (!walletSession.address || !internalPrivKeyBytes) {
        setComposeStatus('Import/unlock the built-in testnet3 wallet first');
        return;
      }
      try {
        setComposeStatus('Collecting balances for messaging consolidation…');
        const keyring = await buildInternalWalletKeyring(internalPrivKeyBytes);

        const allUtxos = [];
        const validChanges = [];

        await Promise.all(keyring.allSigners.map(async sg => {
          const stats = await getAddressBalanceStats(sg.address).catch(() => ({confirmedSat: 0, unconfirmedSat: 0, utxoCount: 0}));
          if (keyring.changeSigners.includes(sg)) {
            sg.utxoCount = stats.utxoCount;
            if (sg.utxoCount < 420) {
              validChanges.push(sg);
            }
          }
          if (stats.confirmedSat <= 0) return;
          try {
            const r = await fetch(`${MEMPOOL_TESTNET_API}/address/${encodeURIComponent(sg.address)}/utxo`);
            if (!r.ok) throw new Error(`UTXO fetch failed for ${sg.label}`);
            const j = await r.json();
            const utxos = j.filter(u => u.status?.confirmed).map(u => ({...u, sourceAddress: sg.address, signer: sg}));
            allUtxos.push(...utxos);
          } catch(e) {}
        }));

        if (!allUtxos.length) {
          setComposeStatus('No confirmed funds to consolidate');
          return;
        }

        if (validChanges.length === 0) {
           const nextIdx = keyring.changeSigners.length;
           if (nextIdx < 200) {
              const d = await deriveDeterministicInternalPrivKey(keyring.main.privBytes, `slot-${nextIdx+1}`);
              const newChange = await buildWalletSignerEntry(d, `change-${nextIdx+1}`);
              newChange.utxoCount = 0;
              keyring.changeSigners.push(newChange);
              keyring.allSigners.push(newChange);
              validChanges.push(newChange);
           } else {
              throw new Error('No valid change addresses to consolidate to');
           }
        }

        validChanges.sort((a,b) => a.utxoCount - b.utxoCount);
        const targetChange = validChanges[0];

        let feeRate = BTC_DEFAULT_FEE_RATE;
        try {
          const fr = await fetch(`${MEMPOOL_TESTNET_API}/v1/fees/recommended`);
          feeRate = Math.max(((await fr.json()).halfHourFee) || BTC_DEFAULT_FEE_RATE, BTC_MIN_FEE_RATE);
        } catch { /* use default */ }

        const estimateFee = Math.ceil((10 + 148 * allUtxos.length + 34) * feeRate);
        const totalSat = allUtxos.reduce((sum, utxo) => sum + Number(utxo.value || 0), 0);
        const sendSat = totalSat - estimateFee;
        if (sendSat < BTC_DUST_LIMIT_SAT) {
          throw new Error(`Consolidation output would be dust after fee (${sendSat} sat)`);
        }

        const rawHex = await buildSignedBtcTx(allUtxos, [{ address: targetChange.address, valueSats: sendSat }]);
        setComposeStatus('Broadcasting consolidation transaction…');
        const bcast = await fetch(`${MEMPOOL_TESTNET_API}/tx`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: rawHex
        });
        if (!bcast.ok) {
          const errText = await bcast.text().catch(() => String(bcast.status));
          throw new Error(`Broadcast failed: ${errText}`);
        }
        const txid = (await bcast.text()).trim() || 'pending';
        const txUrl = txid !== 'pending' ? `https://mempool.space/testnet/tx/${txid}` : null;
        if (dom.composeStatus) {
          const prefix = `Consolidated ${sendSat.toLocaleString()} sat to ${shortTitle(targetChange.address, 20)} · tx `;
          if (txUrl) {
            const link = document.createElement('a');
            link.href = txUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = shortTitle(txid, 20);
            dom.composeStatus.replaceChildren(document.createTextNode(prefix), link);
          } else {
            dom.composeStatus.textContent = prefix + txid;
          }
        }
        if (composeEstimateRequestId) clearTimeout(composeEstimateRequestId);
        composeEstimateRequestId = setTimeout(refreshWalletBalance, 2000);
      } catch (err) {
        setComposeStatus(err.message || 'Consolidation failed');
      }
    }

    async function onGenerateNewKey() {
      setComposeStatus('Generating a testnet3 address…');
      try {
        let privBytes;
        let wif = '';
        let addr = '';
        let attempts = 0;
        do {
          attempts += 1;
          privBytes = crypto.getRandomValues(new Uint8Array(32));
          if (bytesToBigInt(privBytes) === 0n || bytesToBigInt(privBytes) >= SECP_N) continue;
          wif = await privKeyToTestnetWif(privBytes);
          addr = await privKeyToTestnetAddr(privBytes);
        } while (
          attempts < 64
          && (!wif || !addr || hasP2fkDelimiterNumberPair(wif) || hasP2fkDelimiterNumberPair(addr))
        );
        if (!wif || !addr || hasP2fkDelimiterNumberPair(wif) || hasP2fkDelimiterNumberPair(addr)) {
          throw new Error('Could not generate a delimiter-safe testnet3 address; try again');
        }
        if (dom.internalWifInput) {
          dom.internalWifInput.value = wif;
          dom.internalWifInput.type = 'password';
        }
        setComposeStatus(`⚠ New testnet3 address generated for ${addr}. Your private key is masked above — set a password and click Import.`);
      } catch (error) {
        setComposeStatus(error?.message || 'Key generation failed');
      }
    }

    async function onExportPrivKey() {
      if (!internalPrivKeyBytes) {
        setComposeStatus('Wallet must be unlocked to export the key');
        return;
      }
      try {
        const wif = await privKeyToTestnetWif(internalPrivKeyBytes);
        try {
          await navigator.clipboard.writeText(wif);
          setComposeStatus(`WIF copied to clipboard — store it somewhere safe!`);
        } catch {
          setComposeStatus(`WIF (copy manually): ${wif}`);
        }
      } catch (error) {
        setComposeStatus(error?.message || 'Export failed');
      }
    }

    async function privKeyToTestnetAddr(privBytes) {
      const pub = secPrivToPub(privBytes);
      const hash = ripemd160(await sha256Bytes(pub));
      return encodeBase58Check(new Uint8Array([P2FK_DEFAULT_VERSION_BYTE, ...hash])); // 0x6f = testnet legacy P2PKH
    }

    async function deriveDeterministicInternalPrivKey(basePrivBytes, derivationLabel) {
      const seedPrefix = new TextEncoder().encode(`${INTERNAL_CHANGE_DERIVATION_PREFIX}${normalize(derivationLabel)}:`);
      const baseScalar = bytesToBigInt(basePrivBytes);
      const counterBytes = new Uint8Array(4);
      // A valid secp256k1 scalar is found almost immediately in practice; in the extreme edge case, this deterministic loop throws.
      for (let counter = 0; counter <= 0xffffffff; counter += 1) {
        counterBytes[0] = (counter >>> 24) & 0xff;
        counterBytes[1] = (counter >>> 16) & 0xff;
        counterBytes[2] = (counter >>> 8) & 0xff;
        counterBytes[3] = counter & 0xff;
        const seed = new Uint8Array(seedPrefix.length + basePrivBytes.length + counterBytes.length);
        seed.set(seedPrefix, 0);
        seed.set(basePrivBytes, seedPrefix.length);
        seed.set(counterBytes, seedPrefix.length + basePrivBytes.length);
        const tweakHash = await sha256Bytes(seed);
        const tweakScalar = sModN(bytesToBigInt(tweakHash));
        if (tweakScalar === 0n) continue;
        const derivedScalar = sModN(baseScalar + tweakScalar);
        if (derivedScalar === 0n) continue;
        return bigIntToBytes32(derivedScalar);
      }
      throw new Error('Unable to deterministically derive a valid change key');
    }

    async function buildWalletSignerEntry(privBytes, label) {
      const pub = secPrivToPub(privBytes);
      const hash160 = ripemd160(await sha256Bytes(pub));
      const address = await encodeBase58Check(new Uint8Array([P2FK_DEFAULT_VERSION_BYTE, ...hash160]));
      return {
        label: normalize(label),
        privBytes,
        pub,
        scriptPubKey: buildP2pkhScript(hash160),
        address
      };
    }

    async function buildInternalWalletKeyring(basePrivBytes) {
      const main = await buildWalletSignerEntry(basePrivBytes, 'main');
      const changeSigners = [];
      for (let i = 0; i < 200; i += 1) {
        const derivedPrivBytes = await deriveDeterministicInternalPrivKey(basePrivBytes, `slot-${i + 1}`);
        const signer = await buildWalletSignerEntry(derivedPrivBytes, `change-${i + 1}`);
        const stats = await getAddressBalanceStats(signer.address).catch(() => ({ confirmedSat: 0, unconfirmedSat: 0, txCount: 0, utxoCount: 0 }));
        signer.utxoCount = stats.utxoCount;
        changeSigners.push(signer);
        if (i >= 1 && stats.txCount === 0) break;
      }
      return { main, changeSigners, allSigners: [main, ...changeSigners] };
    }

    // AES-256-GCM + PBKDF2 wallet key encryption (browser-only, never leaves device)
    async function encryptPrivKey(privBytes, password) {
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const aesKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: INTERNAL_WALLET_PBKDF2_ITERATIONS, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, privBytes);
      return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(enc)) };
    }

    async function decryptPrivKey(stored, password) {
      const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      const aesKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new Uint8Array(stored.salt), iterations: INTERNAL_WALLET_PBKDF2_ITERATIONS, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(stored.iv) }, aesKey, new Uint8Array(stored.data)));
    }

    async function decodeLegacyTestnetAddressPayload(address) {
      const payload = await decodeBase58Check(normalize(address));
      if (payload.length !== 21 || payload[0] !== 0x6f) {
        throw new Error(`Address is not a valid testnet3 legacy address: ${cleanDisplayText(address, 64)}`);
      }
      return payload;
    }

    async function validateLegacyTestnetAddress(address) {
      await decodeLegacyTestnetAddressPayload(address);
    }

    // Bitcoin P2PKH raw transaction builder
    function buildP2pkhScript(hash160) {
      return new Uint8Array([0x76, 0xa9, 0x14, ...hash160, 0x88, 0xac]);
    }

    async function addrToScript(address) {
      const payload = await decodeLegacyTestnetAddressPayload(address);
      return buildP2pkhScript(payload.slice(1));
    }

    function serializeBtcTx(inputs, outputs, sigIdx = -1, sigScript = null) {
      const u32 = v => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
      const u64 = v => { const n = BigInt(Math.round(v)); return [...u32(Number(n & 0xffffffffn)), ...u32(Number((n >> 32n) & 0xffffffffn))]; };
      const vi = n => n < 0xfd ? [n] : n <= 0xffff ? [0xfd, n & 0xff, (n >> 8) & 0xff] : [0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
      const b = [...u32(1), ...vi(inputs.length)];
      for (let i = 0; i < inputs.length; i++) {
        b.push(...Array.from(hexToBytes(inputs[i].txid)).reverse(), ...u32(inputs[i].vout));
        const sc = sigIdx >= 0 ? (i === sigIdx ? sigScript : new Uint8Array([])) : (inputs[i].scriptSig || new Uint8Array([]));
        b.push(...vi(sc.length), ...sc, ...u32(0xffffffff));
      }
      b.push(...vi(outputs.length));
      for (const o of outputs) b.push(...u64(o.valueSats), ...vi(o.script.length), ...o.script);
      b.push(...u32(0));
      return new Uint8Array(b);
    }

    async function buildSignedBtcTx(utxos, outputs) {
      const inps = utxos.map(u => ({ txid: u.txid, vout: u.vout, signer: u.signer, scriptSig: new Uint8Array([]) }));
      const outs = await Promise.all(outputs.map(async o => ({ valueSats: o.valueSats, script: await addrToScript(o.address) })));
      for (let i = 0; i < inps.length; i++) {
        const signer = inps[i].signer;
        if (!signer?.privBytes || !signer?.pub || !signer?.scriptPubKey) throw new Error('Missing signer metadata for input');
        const pre = new Uint8Array([...serializeBtcTx(inps, outs, i, signer.scriptPubKey), 1, 0, 0, 0]);
        const sh = await sha256Bytes(await sha256Bytes(pre));
        const { r, s } = await ecSign(signer.privBytes, sh);
        const der = derEncode(r, s);
        inps[i].scriptSig = new Uint8Array([der.length + 1, ...der, 0x01, signer.pub.length, ...signer.pub]);
      }
      return bytesToHex(serializeBtcTx(inps, outs));
    }

    async function buildAndBroadcastInternalTx(sendManyOutputs) {
      if (!internalPrivKeyBytes) throw new Error('Internal wallet is locked — import or unlock first');
      const keyring = await buildInternalWalletKeyring(internalPrivKeyBytes);
      const byAddress = new Map(keyring.allSigners.map((signer) => [signer.address, signer]));

      setComposeStatus('Fetching balances from main + derived change addresses…');
      const totalByAddress = new Map();
      const utxoCountByAddr = new Map();
      let availableSat = 0;

      await Promise.all(keyring.allSigners.map(async (signer) => {
        const stats = await getAddressBalanceStats(signer.address).catch(() => ({ confirmedSat: 0, unconfirmedSat: 0, txCount: 0, utxoCount: 0 }));
        totalByAddress.set(signer.address, stats.confirmedSat);
        utxoCountByAddr.set(signer.address, stats.utxoCount);
        signer.utxoCount = stats.utxoCount;
        availableSat += stats.confirmedSat;
      }));

      if (availableSat === 0) throw new Error('No confirmed balances across main or change addresses');

      let feeRate = BTC_DEFAULT_FEE_RATE;
      try {
        const fr = await fetch(`${MEMPOOL_TESTNET_API}/v1/fees/recommended`);
        feeRate = Math.max(((await fr.json()).halfHourFee) || BTC_DEFAULT_FEE_RATE, BTC_MIN_FEE_RATE);
      } catch { /* use default */ }
      // Estimated virtual size for legacy P2PKH (standard policy sizing): 10 bytes tx overhead + 148/input + 34/output.
      const estimateLegacyP2pkhFee = (inputsCount, outputsCount) => Math.ceil((10 + 148 * inputsCount + 34 * outputsCount) * feeRate);
      const outSats = sendManyOutputs.map(o => ({ address: o.address, valueSats: Math.round(o.amount * 1e8) }));
      const totalOut = outSats.reduce((s, o) => s + o.valueSats, 0);

      const sourceCandidates = [...keyring.allSigners]
        .filter(s => (totalByAddress.get(s.address) || 0) > 0)
        .sort((a, b) => (totalByAddress.get(b.address) || 0) - (totalByAddress.get(a.address) || 0));

      if (!sourceCandidates.length) throw new Error('No spendable source address has confirmed balances');

      let selectedSource = null;
      let sel = [];
      let selTotal = 0;

      for (const source of sourceCandidates) {
        setComposeStatus(`Fetching UTXOs for ${source.label}…`);
        let pool = [];
        try {
          const utxoResp = await fetch(`${MEMPOOL_TESTNET_API}/address/${source.address}/utxo`);
          if (!utxoResp.ok) throw new Error(`UTXO fetch failed (${utxoResp.status}) for ${source.label}`);
          pool = (await utxoResp.json())
            .filter((utxo) => utxo.status?.confirmed)
            .map((utxo) => ({ ...utxo, sourceAddress: source.address, signer: source }))
            .sort((a, b) => b.value - a.value);
        } catch (e) {
          continue; // Skip if utxo fetch fails
        }

        const candidateSel = [];
        let candidateTotal = 0;
        for (const utxo of pool) {
          candidateSel.push(utxo);
          candidateTotal += utxo.value;
          const estFee = estimateLegacyP2pkhFee(candidateSel.length, outSats.length + 1);
          if (candidateTotal >= totalOut + estFee) break;
        }
        const candidateFee = estimateLegacyP2pkhFee(candidateSel.length, outSats.length + 1);
        if (candidateSel.length && candidateTotal >= totalOut + candidateFee) {
          selectedSource = source;
          sel = candidateSel;
          selTotal = candidateTotal;
          break;
        }
      }

      if (!selectedSource) {
        throw new Error(`Insufficient funds in a single source address for valid sendmany/change routing: need >= ${totalOut} sat + fee, available ${availableSat} sat`);
      }
      const fee = estimateLegacyP2pkhFee(sel.length, outSats.length + 1);
      const change = selTotal - totalOut - fee;
      if (change < 0) throw new Error(`Insufficient funds: need ${totalOut + fee} sat, have ${selTotal} sat`);

      let validChanges = keyring.changeSigners.filter(c => utxoCountByAddr.get(c.address) < 420);
      if (validChanges.length === 0) {
        const nextIdx = keyring.changeSigners.length;
        if (nextIdx < 200) {
          const d = await deriveDeterministicInternalPrivKey(keyring.main.privBytes, `slot-${nextIdx+1}`);
          const newChange = await buildWalletSignerEntry(d, `change-${nextIdx+1}`);
          newChange.utxoCount = 0;
          keyring.changeSigners.push(newChange);
          keyring.allSigners.push(newChange);
          validChanges.push(newChange);
          byAddress.set(newChange.address, newChange);
        } else {
          throw new Error('All 200 change addresses have >= 420 UTXOs. Cannot create more change outputs.');
        }
      }

      let changeAddress = validChanges[0].address;
      if (validChanges.length > 1) {
        const lastIdx = validChanges.findIndex(c => c.address === internalLastChangeOutputAddr);
        if (lastIdx >= 0) {
          changeAddress = validChanges[(lastIdx + 1) % validChanges.length].address;
        } else if (selectedSource) {
          const selIdx = validChanges.findIndex(c => c.address === selectedSource.address);
          if (selIdx >= 0) {
            changeAddress = validChanges[(selIdx + 1) % validChanges.length].address;
          }
        }
      }
      internalLastChangeOutputAddr = changeAddress;

      const changeSigner = byAddress.get(changeAddress);
      if (!changeSigner) throw new Error('Could not resolve deterministic change destination');
      const finalOuts = [...outSats];
      if (change >= BTC_DUST_LIMIT_SAT) finalOuts.push({ address: changeAddress, valueSats: change });
      setComposeStatus(`Signing tx (${sel.length} inputs from ${selectedSource.label}, ${finalOuts.length} outputs, ~${fee} sat fee, change → ${changeSigner.label})…`);
      const rawHex = await buildSignedBtcTx(sel, finalOuts);
      setComposeStatus('Broadcasting transaction…');
      const bcast = await fetch(`${MEMPOOL_TESTNET_API}/tx`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: rawHex });
      if (!bcast.ok) {
        const errText = await bcast.text().catch(() => String(bcast.status));
        throw new Error(`Broadcast failed: ${errText}`);
      }
      return (await bcast.text()).trim();
    }

    // ── Internal wallet UI handlers ───────────────────────────────────────────



// Expose to window
window.normalize = typeof normalize !== 'undefined' ? normalize : undefined;
window.decodeHtmlEntities = typeof decodeHtmlEntities !== 'undefined' ? decodeHtmlEntities : undefined;
window.replaceSaltMarkers = typeof replaceSaltMarkers !== 'undefined' ? replaceSaltMarkers : undefined;
window.cleanDisplayText = typeof cleanDisplayText !== 'undefined' ? cleanDisplayText : undefined;
window.hasP2fkDelimiterNumberPair = typeof hasP2fkDelimiterNumberPair !== 'undefined' ? hasP2fkDelimiterNumberPair : undefined;
window.getAddressBalanceStats = typeof getAddressBalanceStats !== 'undefined' ? getAddressBalanceStats : undefined;
window.bytesToBigInt = typeof bytesToBigInt !== 'undefined' ? bytesToBigInt : undefined;
window.bigIntToBytes32 = typeof bigIntToBytes32 !== 'undefined' ? bigIntToBytes32 : undefined;
window.bytesToHex = typeof bytesToHex !== 'undefined' ? bytesToHex : undefined;
window.hexToBytes = typeof hexToBytes !== 'undefined' ? hexToBytes : undefined;
window.sModP = typeof sModP !== 'undefined' ? sModP : undefined;
window.sModN = typeof sModN !== 'undefined' ? sModN : undefined;
window.sInv = typeof sInv !== 'undefined' ? sInv : undefined;
window.japDouble = typeof japDouble !== 'undefined' ? japDouble : undefined;
window.japAdd = typeof japAdd !== 'undefined' ? japAdd : undefined;
window.japToAff = typeof japToAff !== 'undefined' ? japToAff : undefined;
window.sMul = typeof sMul !== 'undefined' ? sMul : undefined;
window.secPrivToPub = typeof secPrivToPub !== 'undefined' ? secPrivToPub : undefined;
window.rfc6979k = typeof rfc6979k !== 'undefined' ? rfc6979k : undefined;
window.ecSign = typeof ecSign !== 'undefined' ? ecSign : undefined;
window.derEncode = typeof derEncode !== 'undefined' ? derEncode : undefined;
window.ripemd160 = typeof ripemd160 !== 'undefined' ? ripemd160 : undefined;
window.encodeBase58 = typeof encodeBase58 !== 'undefined' ? encodeBase58 : undefined;
window.encodeBase58Check = typeof encodeBase58Check !== 'undefined' ? encodeBase58Check : undefined;
window.decodeBase58 = typeof decodeBase58 !== 'undefined' ? decodeBase58 : undefined;
window.decodeBase58Check = typeof decodeBase58Check !== 'undefined' ? decodeBase58Check : undefined;
window.wifToPrivKeyBytes = typeof wifToPrivKeyBytes !== 'undefined' ? wifToPrivKeyBytes : undefined;
window.privKeyToTestnetWif = typeof privKeyToTestnetWif !== 'undefined' ? privKeyToTestnetWif : undefined;
window.deriveDeterministicInternalPrivKey = typeof deriveDeterministicInternalPrivKey !== 'undefined' ? deriveDeterministicInternalPrivKey : undefined;
window.buildWalletSignerEntry = typeof buildWalletSignerEntry !== 'undefined' ? buildWalletSignerEntry : undefined;
window.buildInternalWalletKeyring = typeof buildInternalWalletKeyring !== 'undefined' ? buildInternalWalletKeyring : undefined;
window.encryptPrivKey = typeof encryptPrivKey !== 'undefined' ? encryptPrivKey : undefined;
window.decryptPrivKey = typeof decryptPrivKey !== 'undefined' ? decryptPrivKey : undefined;
window.decodeLegacyTestnetAddressPayload = typeof decodeLegacyTestnetAddressPayload !== 'undefined' ? decodeLegacyTestnetAddressPayload : undefined;
window.validateLegacyTestnetAddress = typeof validateLegacyTestnetAddress !== 'undefined' ? validateLegacyTestnetAddress : undefined;
window.buildP2pkhScript = typeof buildP2pkhScript !== 'undefined' ? buildP2pkhScript : undefined;
window.addrToScript = typeof addrToScript !== 'undefined' ? addrToScript : undefined;
window.serializeBtcTx = typeof serializeBtcTx !== 'undefined' ? serializeBtcTx : undefined;
window.buildSignedBtcTx = typeof buildSignedBtcTx !== 'undefined' ? buildSignedBtcTx : undefined;
window.buildAndBroadcastInternalTx = typeof buildAndBroadcastInternalTx !== 'undefined' ? buildAndBroadcastInternalTx : undefined;

async function buildP2fkRecipientsAndCost({ messageText, attachments, extraRecipients = [], fromAddress, amountPerRecipient }) {
    const safeMessageText = sanitizeP2fkMessageText(messageText);
    const unsignedPayload = buildP2fkUnsignedObject(safeMessageText, attachments);
    const signedHashHex = (await sha256HexFromText(unsignedPayload.unsignedObj)).toUpperCase();
    const signature = await signWithWallet(signedHashHex);
    const signedObj = `SIG${unsignedPayload.delimiter}${P2FK_SIGNATURE_VERSION_MARKER}${unsignedPayload.delimiter}${signature}${unsignedPayload.unsignedObj}`;
    const recipients = await encodeP2fkAddresses(signedObj, P2FK_DEFAULT_VERSION_BYTE);
    const recipientSet = new Set(recipients);

    await validateLegacyTestnetAddress(fromAddress);

    for (const keyword of parseHashtagKeywords(safeMessageText)) {
      try {
        const keywordAddress = await getPublicAddressByKeyword(keyword);
        if (keywordAddress) {
          await validateLegacyTestnetAddress(keywordAddress);
          recipientSet.add(keywordAddress);
        }
      } catch (error) {
        console.debug('Unable to encode keyword address', keyword, error);
      }
    }
    for (const address of extraRecipients) {
      if (!address || address === fromAddress) continue;
      await validateLegacyTestnetAddress(address);
      recipientSet.add(address);
    }
    if (fromAddress) recipientSet.add(fromAddress);
    const recipientList = [...recipientSet];
    const outputs = recipientList.map((address) => ({ address, amount: amountPerRecipient }));
    const cost = amountPerRecipient * outputs.length;
    return { outputs, cost };
}

async function sendManyWithWallet(outputs) {
    return buildAndBroadcastInternalTx(outputs);
}

async function signWithWallet(messageText) {
    if (!internalPrivKeyBytes) throw new Error('Internal wallet is locked');
    const messageDigest = await hashBitcoinSignedMessage(messageText);
    const { r, s, recoveryId } = await ecSign(internalPrivKeyBytes, messageDigest);
    const compact = new Uint8Array(65);
    compact[0] = 27 + 4 + recoveryId;
    compact.set(bigIntToBytes32(r), 1);
    compact.set(bigIntToBytes32(s), 33);
    return btoa(String.fromCharCode.apply(null, compact));
}

// Ensure these functions also exist if they don't already
function sanitizeP2fkMessageText(text) {
    return text.trim();
}

function buildP2fkUnsignedObject(messageText, attachments = {}) {
    const P2FK_DELIMITER_ASCII = String.fromCharCode(31);
    let unsignedObj = `${P2FK_DELIMITER_ASCII}SUP${P2FK_DELIMITER_ASCII}`;
    const parts = [messageText];
    for (const [key, value] of Object.entries(attachments)) {
        parts.push(`${key}=${value}`);
    }
    unsignedObj += parts.join(P2FK_DELIMITER_ASCII);
    return { delimiter: P2FK_DELIMITER_ASCII, unsignedObj };
}

async function sha256HexFromText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


async function encodeP2fkAddresses(dataString, versionByte) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(dataString);
    const addresses = [];
    // Convert bytes into base58check addresses.
    // 20 bytes per address
    for (let i = 0; i < bytes.length; i += 20) {
        const chunk = bytes.slice(i, i + 20);
        const payload = new Uint8Array(20);
        payload.set(chunk, 0); // pad with zeros if < 20
        const addrBytes = new Uint8Array(21);
        addrBytes[0] = versionByte;
        addrBytes.set(payload, 1);

        // Compute checksum
        const hash1 = await crypto.subtle.digest('SHA-256', addrBytes);
        const hash2 = await crypto.subtle.digest('SHA-256', hash1);
        const checksum = new Uint8Array(hash2).slice(0, 4);

        const finalBytes = new Uint8Array(25);
        finalBytes.set(addrBytes, 0);
        finalBytes.set(checksum, 21);

        addresses.push(encodeBase58(finalBytes));
    }
    return addresses;
}

function parseHashtagKeywords(text) {
    const KEYWORD_REGEX = /(?:^|\s)#([a-zA-Z0-9_-]+)/g;
    const keywords = [];
    let match;
    while ((match = KEYWORD_REGEX.exec(text)) !== null) {
        keywords.push(match[1].toLowerCase());
    }
    return keywords;
}

function getPublicAddressByKeyword(keyword) {
    return fetch(`https://p2fk.io/api/GetRootByKeyword/${keyword}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) return data[0].Message.Address;
            return null;
        });
}

function validateLegacyTestnetAddress(address) {
    // For now just pass it through
    return Promise.resolve(true);
}


window.buildP2fkRecipientsAndCost = buildP2fkRecipientsAndCost;
window.sendManyWithWallet = sendManyWithWallet;
window.signWithWallet = signWithWallet;

window.resolveTxidFromSendResult = typeof resolveTxidFromSendResult !== 'undefined' ? resolveTxidFromSendResult : undefined;
window.pickRandomDelimiter = typeof pickRandomDelimiter !== 'undefined' ? pickRandomDelimiter : undefined;
window.createNegativeSalt = typeof createNegativeSalt !== 'undefined' ? createNegativeSalt : undefined;
window.sanitizeP2fkMessageText = typeof sanitizeP2fkMessageText !== 'undefined' ? sanitizeP2fkMessageText : undefined;
window.buildP2fkUnsignedObject = typeof buildP2fkUnsignedObject !== 'undefined' ? buildP2fkUnsignedObject : undefined;
window.encodeP2fkAddresses = typeof encodeP2fkAddresses !== 'undefined' ? encodeP2fkAddresses : undefined;
window.signWithWallet = typeof signWithWallet !== 'undefined' ? signWithWallet : undefined;
window.buildP2fkRecipientsAndCost = typeof buildP2fkRecipientsAndCost !== 'undefined' ? buildP2fkRecipientsAndCost : undefined;
window.privKeyToTestnetAddr = typeof privKeyToTestnetAddr !== 'undefined' ? privKeyToTestnetAddr : undefined;
window.sha256Bytes = typeof sha256Bytes !== 'undefined' ? sha256Bytes : undefined;
window.sha256HexFromText = typeof sha256HexFromText !== 'undefined' ? sha256HexFromText : undefined;
window.encodeBitcoinVarInt = typeof encodeBitcoinVarInt !== 'undefined' ? encodeBitcoinVarInt : undefined;
window.hashBitcoinSignedMessage = typeof hashBitcoinSignedMessage !== 'undefined' ? hashBitcoinSignedMessage : undefined;
window.parseHashtagKeywords = typeof parseHashtagKeywords !== 'undefined' ? parseHashtagKeywords : undefined;

window.fetchUnconfirmedP2fkMessages = async function fetchUnconfirmedP2fkMessages(address) {
    const cleanAddress = encodeURIComponent(address.trim().replace(/^"|"$/g, ''));
    try {
        const response = await fetch(`https://mempool.space/testnet/api/address/${cleanAddress}/txs/mempool`);
        if (!response.ok) return [];
        const txs = await response.json();
        const unconfirmed = [];

        for (const tx of txs) {
            let p2fkData = null;
            let fromAddr = null;

            if (tx.vin && tx.vin.length > 0 && tx.vin[0].prevout) {
                fromAddr = tx.vin[0].prevout.scriptpubkey_address;
            }

            for (const vout of tx.vout) {
                if (vout.scriptpubkey_address) {
                    try {
                        const payload = await decodeBase58Check(vout.scriptpubkey_address);
                        if (payload.length > 1 && payload[0] === P2FK_DEFAULT_VERSION_BYTE) {
                            const chunk = payload.slice(1);
                            let content = "";
                            for (let i = 0; i < chunk.length; i++) {
                                if (chunk[i] !== P2FK_PADDING_CHAR.charCodeAt(0)) {
                                    content += String.fromCharCode(chunk[i]);
                                }
                            }
                            if (p2fkData === null) p2fkData = "";
                            p2fkData += content;
                        }
                    } catch (e) {
                    }
                }
            }

            if (p2fkData && p2fkData.startsWith("SIG")) {
                const parts = p2fkData.split(p2fkData.charAt(3));
                if (parts.length >= 4) {
                    const message = parts.slice(3).join(p2fkData.charAt(3));
                    unconfirmed.push({
                        TransactionId: tx.txid,
                        Message: message,
                        BlockDate: new Date().toISOString(),
                        FromAddress: fromAddr || cleanAddress
                    });
                }
            }
        }
        return unconfirmed;
    } catch (e) {
        return [];
    }
}

window.uploadToIpfs = async function uploadToIpfs(jsonData) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, 'upload.json');
    const res = await fetch('https://p2fk.io/api/v0/add', {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error('Failed to upload to IPFS: ' + res.status);
    const result = await res.json();
    return result.Hash;
}


async function generateTestnet3Address() {
    const privBytes = new Uint8Array(32);
    crypto.getRandomValues(privBytes);

    // WIF encoding
    const payload = new Uint8Array(34);
    payload[0] = 0xef; // testnet WIF version
    payload.set(privBytes, 1);
    payload[33] = 0x01; // compressed
    const wif = await encodeBase58Check(payload);

    // Address encoding
    const publicKey = await secp256k1PublicKeyCreate(privBytes, true);
    const pubKeyHash = await hash160(publicKey);
    const addrPayload = new Uint8Array(21);
    addrPayload[0] = 0x6f; // testnet address version
    addrPayload.set(pubKeyHash, 1);
    const address = await encodeBase58Check(addrPayload);

    return { wif, address };
}
window.generateTestnet3Address = generateTestnet3Address;

window.privKeyToTestnetWif = typeof privKeyToTestnetWif !== 'undefined' ? privKeyToTestnetWif : undefined;
