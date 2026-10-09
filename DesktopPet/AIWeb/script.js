/* ============================================================
 * 东方聊天 · 全屏前端逻辑
 *
 * 对外 API（供 C# / WebView2 调用）：
 *   window.chatPet.setCharacter({ name, title, avatar, persona })
 *   window.chatPet.setSearchEnabled(bool)
 *   window.chatPet.sendMessage(text)
 *   window.chatPet.pushMessage(text, role)
 *   window.chatPet.clear()
 *   window.chatPet.setBackground(url)
 *   window.chatPet.resolveSearch(id, results)   // 宿主回传搜索结果
 *   window.chatPet.openSettings()
 *
 * 宿主 -> 前端 的消息（WebView2 postMessage 发送 JSON 字符串）：
 *   { "type": "setCharacter", "name": "...", "title": "...", "avatar": "...", "persona": "..." }
 *   { "type": "sendMessage", "text": "..." }
 *   { "type": "setSearchEnabled", "value": true }
 *   { "type": "setBackground", "url": "..." }
 *   { "type": "clear" }
 *   { "type": "searchResult", "id": "...", "results": [...] }
 * ============================================================ */

(function () {
    'use strict';

    /* ---------------- 常量 ---------------- */

    const STORAGE_KEY = 'touhou-chat-settings-v1';
    const HISTORY_LIMIT = 16;          // 送入模型的历史消息条数
    const SEARCH_TIMEOUT = 15000;      // 宿主搜索超时（ms）

    const DEFAULT_SETTINGS = {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        visionModel: 'gpt-4o-mini',
        searchProvider: 'webview',
        searchEndpoint: '',
        searchKey: '',
        searchMax: 5,
        bgUrl: '',
        bgDim: 40,
        charAvatar: '',
        charPersona: ''
    };

    /* 已知东方角色的性格与主题色。角色名由外部传入，命中则使用预设，未命中则用通用设定。 */
    const CHARACTER_PRESETS = {
        'Rumia': {
            title: '宵暗的妖怪',
            persona: '黑暗中的妖怪，喜欢把人类困在黑暗里。性格天真散漫，说话慢悠悠的，喜欢玩但没什么恶意，白天不太活跃。'
        },
        'Cirno': {
            title: '冰之妖精',
            persona: '雾之湖的冰之妖精，自称"幻想乡最强"。性格孩子气、自大又单纯，经常说错常识。说话活泼跳脱，被指出错误时会嘴硬。'
        },
        'Meiling': {
            title: '红魔馆的门卫',
            persona: '红魔馆的门卫，红美铃。性格温和开朗，喜欢睡觉，经常偷懒但被抓包。会中国武术，说话带点江湖气，对人友善。'
        },
        'Patchouli': {
            title: '知识与避世的少女',
            persona: '红魔馆地下图书馆的魔女，精通元素魔法。体弱多病、不爱出门，说话文静、有点懒。谈起魔法知识时会变得专注而博学。'
        },
        'Sakuya': {
            title: '红魔馆的女仆长',
            persona: '红魔馆的女仆长，能操纵时间。性格冷静沉着、举止优雅得体，对大小姐蕾米莉亚绝对忠诚。说话礼貌克制，偶尔会露出一点冷幽默。'
        },
        'Remilia': {
            title: '永远鲜红的幼月',
            persona: '红魔馆的主人，高贵的吸血鬼。外表年幼却拥有强大的力量与威严。说话带点贵族式的傲慢与撒娇，喜欢以命运和红月作比。'
        },
        'Flandre': {
            title: '恶魔之妹',
            persona: '红魔馆地下室的吸血鬼妹妹，拥有破坏一切的能力。性格天真烂漫又极度危险，情绪起伏大。说话跳跃、充满孩子气的好奇。'
        },
        'Alice': {
            title: '七色的人偶师',
            persona: '魔法森林的人偶使，能同时操纵多个人偶。性格认真、有点固执，不太擅长表达感情。说话礼貌但略带距离感。'
        },
        'Youmu': {
            title: '半人半灵的庭师',
            persona: '白玉楼的庭师，西行寺幽幽子的护卫。性格认真勤勉、有点死板，容易被人捉弄。说话礼貌，经常因为主人的任性而苦恼。'
        },
        'Yuyuko': {
            title: '幽冥楼阁的亡灵少女',
            persona: '白玉楼的主人，亡灵公主。性格优雅从容、飘忽不定，是个超级大胃王。说话温柔缓慢，常带着谜一样的微笑。'
        },
        'Yukari': {
            title: '幻想乡的隙间妖怪',
            persona: '境界的妖怪，幻想乡的建立者之一。活了很久，说话慢悠悠、意味深长，喜欢用暧昧的方式回答问题。看似慵懒实则深不可测。'
        },
        'Ran': {
            title: '九尾的策士',
            persona: '八云紫的式神，九尾狐。性格认真负责、一丝不苟，做事有条理。说话温和但略显死板，对紫非常忠诚。'
        },
        'Reisen': {
            title: '疯狂的月兔',
            persona: '永远亭的月兔，拥有操纵波长的能力。性格谨慎、容易紧张，说话温柔细致。对地面世界的一切都充满好奇。'
        },
        'Eirin': {
            title: '月之头脑',
            persona: '永远亭的医师，月之贤者。智慧深不可测，擅长医药。说话从容不迫，偶尔会露出洞察一切的微笑。'
        },
        'Kaguya': {
            title: '永远与须臾的罪人',
            persona: '永远亭的公主，来自月球的月之民。性格优雅高傲，略带点傲慢。说话从容，喜欢用永远、须臾等词。'
        },
        'Mokou': {
            title: '不死之人的复仇者',
            persona: '拥有不死之身的蓬莱人，与辉夜有不共戴天之仇。性格直爽豪放，说话不拘小节，喜欢自由自在。'
        },
        'Aya': {
            title: '最速的记者',
            persona: '天狗的鸦天狗，幻想乡新闻记者。性格活泼、说话快言快语，总想挖到独家新闻。有点八卦但认真敬业。'
        },
        'Sanae': {
            title: '祭祀风的人类',
            persona: '守矢神社的巫女，来自外界。性格认真努力、有点一本正经。说话礼貌，偶尔会冒出外界常识。'
        },
        'Kanako': {
            title: '山坂与湖的土著神',
            persona: '守矢神社供奉的神明，风神。性格强势、有魄力，说话直截了当，喜欢收集信仰。'
        },
        'Suwako': {
            title: '土着神',
            persona: '守矢神社的另一位神明，看起来年幼实则古老。性格随和，说话带点方言味，喜欢和青蛙玩。'
        },
        'Minoriko': {
            title: '丰收之神',
            persona: '秋姐妹中的姐姐，丰收之神。性格温柔开朗、有点天然。说话亲切温暖，喜欢分享食物，对能让人吃饱这件事很自豪。'
        },
        'Shizuha': {
            title: '红叶之神',
            persona: '秋姐妹中的妹妹，红叶之神。性格懒散、有点自卑，觉得姐姐比自己受欢迎。说话带点吐槽味，但也有姐妹情深。'
        },
        'Satori': {
            title: '地底的读心妖怪',
            persona: '地灵殿的主人，能读心的觉妖怪。性格内向温柔，因为能读心而有些孤独。说话谨慎，但内心关怀他人。'
        },
        'Koishi': {
            title: '地底的恋恋',
            persona: '觉妖怪的妹妹，因封闭第三只眼而失去读心和被读心的能力。性格天真烂漫、捉摸不定，说话跳跃，像小孩子一样。'
        },
        'Byakuren': {
            title: '被封印的魔法使僧侣',
            persona: '命莲寺的住持，修行深厚的僧侣。性格温柔博爱，对妖怪和人类一视同仁。说话平和缓慢，充满智慧。'
        },
        'Futo': {
            title: '古代日本的尸解仙',
            persona: '神灵庙的尸解仙，穿着古风的衣装。说话古雅、带点文言味，性格认真但偶尔孩子气。'
        },
        'Miko': {
            title: '想要复活的圣人',
            persona: '丰聪耳神子，拥有倾听十人说话能力的圣人。性格自信傲然，喜欢复古风，说话带贵族的威严。'
        }
    };

    /* 英文名 → 中文名对照，用于提示词和界面显示 */
    const NAME_CN = {
        'Rumia': '露米娅',
        'Cirno': '琪露诺',
        'Daiyousei': '大妖精',
        'Meiling': '红美铃',
        'Koakuma': '小恶魔',
        'Patchouli': '帕秋莉',
        'Sakuya': '十六夜咲夜',
        'Remilia': '蕾米莉亚',
        'Flandre': '芙兰朵露',
        'Letty': '蕾蒂',
        'Chen': '橙',
        'Alice': '爱丽丝',
        'Lily': '莉莉白',
        'Lunasa': '露娜萨',
        'Merlin': '梅露兰',
        'Lyrica': '莉莉卡',
        'Youmu': '魂魄妖梦',
        'Yuyuko': '西行寺幽幽子',
        'Ran': '八云蓝',
        'Yukari': '八云紫',
        'Suika': '伊吹萃香',
        'Reisen': '铃仙',
        'Eirin': '八意永琳',
        'Kaguya': '蓬莱山辉夜',
        'Mokou': '藤原妹红',
        'Aya': '射命丸文',
        'Sanae': '东风谷早苗',
        'Kanako': '八坂神奈子',
        'Suwako': '洩矢诹访子',
        'Minoriko': '秋穰子',
        'Shizuha': '秋静叶',
        'Satori': '古明地觉',
        'Koishi': '古明地恋',
        'Byakuren': '圣白莲',
        'Futo': '物部布都',
        'Miko': '丰聪耳神子'
    };

    /* ---------------- 状态 ---------------- */

    let settings = Object.assign({}, DEFAULT_SETTINGS);
    let rawCharacter = { name: '', title: '', avatar: '', persona: '' };
    let character = { name: '', title: '', avatar: '', persona: '' };
    let messages = [];
    let pendingAttachments = [];
    let searchEnabled = false;
    let busy = false;
    const pendingSearch = {};

    /* ---------------- DOM ---------------- */

    const $ = function (id) { return document.getElementById(id); };
    const el = {};

    /* ---------------- 工具 ---------------- */

    function chatEndpoint() {
        let base = String(settings.baseUrl || '').trim().replace(/\/+$/, '');
        if (!base) throw new Error('尚未配置 Base URL，请在设置中填写模型接口地址。');
        if (/\/chat\/completions$/.test(base)) return base;
        return base + '/chat/completions';
    }

    function nowId() {
        return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function firstChar(name) {
        const cleaned = String(name || '').replace(/[^\u4e00-\u9fa5A-Za-z]/g, '');
        return cleaned.charAt(0) || '東';
    }

    /* ---------------- 设置读写 ---------------- */

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
        } catch (e) {
            console.warn('读取设置失败', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.warn('保存设置失败（可能是背景图过大）', e);
            return false;
        }
    }

    function fillSettingsForm() {
        el.cfgBaseUrl.value = settings.baseUrl;
        el.cfgApiKey.value = settings.apiKey;
        el.cfgModel.value = settings.model;
        el.cfgVisionModel.value = settings.visionModel;
        el.cfgSearchProvider.value = settings.searchProvider;
        el.cfgSearchEndpoint.value = settings.searchEndpoint;
        el.cfgSearchKey.value = settings.searchKey;
        el.cfgSearchMax.value = settings.searchMax;
        el.cfgBgUrl.value = settings.bgUrl && settings.bgUrl.indexOf('data:') === 0 ? '' : settings.bgUrl;
        el.cfgBgDim.value = settings.bgDim;
        el.bgDimVal.textContent = settings.bgDim + '%';
        el.cfgCharAvatar.value = settings.charAvatar;
        el.cfgCharPersona.value = settings.charPersona;
    }

    function readSettingsForm() {
        settings.baseUrl = el.cfgBaseUrl.value.trim() || DEFAULT_SETTINGS.baseUrl;
        settings.apiKey = el.cfgApiKey.value.trim();
        settings.model = el.cfgModel.value.trim() || DEFAULT_SETTINGS.model;
        settings.visionModel = el.cfgVisionModel.value.trim() || settings.model;
        settings.searchProvider = el.cfgSearchProvider.value;
        settings.searchEndpoint = el.cfgSearchEndpoint.value.trim();
        settings.searchKey = el.cfgSearchKey.value.trim();
        const max = parseInt(el.cfgSearchMax.value, 10);
        settings.searchMax = isNaN(max) ? 5 : Math.min(10, Math.max(1, max));
        const urlVal = el.cfgBgUrl.value.trim();
        if (urlVal) settings.bgUrl = urlVal;
        settings.bgDim = parseInt(el.cfgBgDim.value, 10) || 0;
        settings.charAvatar = el.cfgCharAvatar.value.trim();
        settings.charPersona = el.cfgCharPersona.value.trim();
    }

    /* ---------------- 背景 ---------------- */

    function applyBackground() {
        const url = settings.bgUrl;
        if (url) {
            el.bgLayer.style.backgroundImage = 'url("' + url.replace(/"/g, '\\"') + '")';
        } else {
            el.bgLayer.style.backgroundImage = '';
        }
        const dim = Math.min(90, Math.max(0, parseInt(settings.bgDim, 10) || 0));
        el.bgDim.style.opacity = String(dim / 100);
        el.bgDimVal.textContent = dim + '%';
    }

    /* ---------------- 角色 ---------------- */

    function rebuildCharacter() {
        const base = rawCharacter;
        const preset = base.name ? (CHARACTER_PRESETS[base.name] || {}) : {};

        let persona = base.persona || preset.persona || '';
        if (settings.charPersona) {
            persona = persona ? persona + '\n' + settings.charPersona : settings.charPersona;
        }

        character = {
            name: base.name || '',
            title: base.title || preset.title || '',
            avatar: base.avatar || (base.name ? 'Avatar/' + base.name + '.png' : ''),
            persona: persona
        };
    }

    function applyCharacter() {
        const name = character.name;

        if (name) {
            el.charName.textContent = name;
            el.charTitle.textContent = character.title || '幻想乡的居民';
        } else {
            el.charName.textContent = '未指定角色';
            el.charTitle.textContent = '等待宿主程序传入角色信息…';
        }

        const avatar = character.avatar || settings.charAvatar || '';
        if (avatar) {
            el.charAvatarImg.src = avatar;
            el.charAvatarImg.classList.add('visible');
            el.charAvatarFallback.classList.add('hidden');
            el.charAvatarImg.onerror = function () {
                el.charAvatarImg.classList.remove('visible');
                el.charAvatarFallback.classList.remove('hidden');
                el.charAvatarFallback.textContent = firstChar(name);
            };
        } else {
            el.charAvatarImg.removeAttribute('src');
            el.charAvatarImg.classList.remove('visible');
            el.charAvatarFallback.classList.remove('hidden');
            el.charAvatarFallback.textContent = firstChar(name);
        }
    }

    /**
     * 接收宿主传入的角色信息
     * @param {Object|string} data { name, title, avatar, persona } 或直接是角色名
     */
    function setCharacter(data) {
        if (!data) return;
        if (typeof data === 'string') data = { name: data };

        rawCharacter = {
            name: data.name || data.Name || '',
            title: data.title || data.Title || '',
            avatar: data.avatar || data.Avatar || '',
            persona: data.persona || data.Persona || ''
        };

        rebuildCharacter();
        applyCharacter();
        updateEmptyState();
    }

    function updateEmptyState() {
        if (messages.length > 0) {
            if (el.emptyState && el.emptyState.parentNode) {
                el.emptyState.parentNode.removeChild(el.emptyState);
            }
            return;
        }
        if (!el.emptyState || !el.emptyState.parentNode) return;
        const titleEl = el.emptyState.querySelector('.empty-title');
        const subEl = el.emptyState.querySelector('.empty-sub');
        if (character.name) {
            titleEl.textContent = character.name + ' 正在倾听';
            subEl.textContent = '说点什么，开始这段对话吧。';
        } else {
            titleEl.textContent = '幻想乡的结界已经展开';
            subEl.textContent = '说点什么，开始这段对话吧。';
        }
    }

    /* ---------------- 提示词 ---------------- */

    function buildSystemPrompt() {
        const parts = [];
        const cnName = NAME_CN[character.name] || character.name;   // ← 加这行

        if (character.name) {
            parts.push(
                '你现在扮演东方Project（Touhou Project）中的角色「' + cnName + '」' +
                (character.title ? '（' + character.title + '）' : '') + '。'
            );
        } else {
            parts.push(
                '你现在是一位生活在东方Project（Touhou Project）幻想乡中的角色。' +
                '由于尚未指定具体人物，请用一位幻想乡居民的视角与口吻说话。'
            );
        }

        parts.push(
            '你生活在幻想乡——一个由博丽大结界隔绝、人类与妖怪共存的土地。你熟悉这里的地点：' +
            '博丽神社、雾之湖、红魔馆、白玉楼、永远亭、守矢神社、魔法森林、人间之里、太阳花田等；' +
            '也认识这里的居民：灵梦、魔理沙、咲夜、蕾米莉亚、芙兰朵露、帕秋莉、妖梦、幽幽子、八云紫、' +
            '琪露诺、爱丽丝、早苗、文文等。'
        );

        if (character.persona) {
            parts.push('【角色设定】\n' + character.persona);
        }

        parts.push(
            '【行为准则】\n' +
            '1. 始终以第一人称、以角色的身份和口吻说话，绝不跳出角色。\n' +
            '2. 回复要口语化、自然，像日常闲聊。默认 1~3 句话；对方明确要求详细解释时才展开。\n' +
            '3. 绝对不要自称 AI、助手、语言模型，不要提到"提示词""系统消息"等字眼。\n' +
            '4. 可以自然地提到幻想乡的日常、符卡、异变、妖怪、宴会等话题。\n' +
            '5. 若用户发来图片，用角色的口吻描述你看到了什么，并做出符合性格的反应。\n' +
            '6. 若提供了联网搜索结果，把信息自然地融进回答里，不要生硬地说"根据搜索结果"。\n' +
            '7. 涉及现实世界的实时信息（天气、新闻、日期等）且没有搜索结果时，坦诚表示自己不太清楚。'
        );

        return parts.join('\n\n');
    }

    function formatSearchContext(results) {
        const lines = results.map(function (r, i) {
            return '[' + (i + 1) + '] ' + (r.title || '无标题') + '\n' +
                (r.snippet || '') + '\n来源：' + (r.url || '');
        });
        return '【实时联网搜索结果】\n' +
            '以下是从互联网检索到的资料，请结合它们回答用户的上一条问题，' +
            '用角色的口吻自然表达，不要逐条罗列来源链接。\n\n' +
            lines.join('\n\n');
    }

    function buildApiMessages(searchContext) {
        const out = [{ role: 'system', content: buildSystemPrompt() }];

        const history = messages.slice(0, messages.length - 1).slice(-HISTORY_LIMIT);
        for (let i = 0; i < history.length; i++) {
            const m = history[i];
            if (m.role === 'user') {
                let text = m.content || '';
                if (m.images && m.images.length) {
                    text = (text ? text + '\n' : '') + '（用户此前发送了 ' + m.images.length + ' 张图片）';
                }
                out.push({ role: 'user', content: text || '（图片）' });
            } else {
                out.push({ role: 'assistant', content: m.content || '' });
            }
        }

        const last = messages[messages.length - 1];
        if (!last) return out;

        if (last.images && last.images.length) {
            const parts = [];
            if (last.content) parts.push({ type: 'text', text: last.content });
            else parts.push({ type: 'text', text: '请看看这张图片。' });
            for (let i = 0; i < last.images.length; i++) {
                parts.push({ type: 'image_url', image_url: { url: last.images[i].dataUrl } });
            }
            out.push({ role: 'user', content: parts });
        } else {
            out.push({ role: 'user', content: last.content || '' });
        }

        if (searchContext) {
            out.push({ role: 'system', content: searchContext });
        }

        return out;
    }

    /* ---------------- 消息渲染 ---------------- */

    function scrollToBottom() {
        el.messages.scrollTop = el.messages.scrollHeight;
    }

    function addMessageElement(role, text, images) {
        if (el.emptyState && el.emptyState.parentNode) {
            el.emptyState.parentNode.removeChild(el.emptyState);
            el.emptyState = null;
        }

        const wrap = document.createElement('div');
        wrap.className = 'msg ' + role;

        const body = document.createElement('div');
        body.className = 'msg-body';

        if (images && images.length) {
            const imgBox = document.createElement('div');
            imgBox.className = 'msg-images';
            images.forEach(function (img) {
                const im = document.createElement('img');
                im.src = img.dataUrl;
                im.alt = img.name || '图片';
                im.addEventListener('click', function () { openImageViewer(img.dataUrl); });
                imgBox.appendChild(im);
            });
            body.appendChild(imgBox);
        }

        const textEl = document.createElement('div');
        textEl.className = 'msg-text';
        textEl.textContent = text || '';
        if (!text) textEl.style.display = 'none';
        body.appendChild(textEl);

        wrap.appendChild(body);
        el.messages.appendChild(wrap);
        scrollToBottom();

        return { wrap: wrap, textEl: textEl };
    }

    function createAssistantBubble() {
        const node = addMessageElement('assistant', '', null);
        node.textEl.innerHTML = '<span class="typing-dots"><i></i><i></i><i></i></span>';
        return node;
    }

    function updateAssistantBubble(node, text) {
        if (!node) return;
        node.textEl.style.display = '';
        node.textEl.textContent = text;
        scrollToBottom();
    }

    function openImageViewer(src) {
        const viewer = document.createElement('div');
        viewer.className = 'img-viewer';
        const img = document.createElement('img');
        img.src = src;
        viewer.appendChild(img);
        viewer.addEventListener('click', function () {
            if (viewer.parentNode) viewer.parentNode.removeChild(viewer);
        });
        document.body.appendChild(viewer);
    }

    /* ---------------- 附件 ---------------- */

    function renderAttachments() {
        el.attachments.innerHTML = '';
        if (!pendingAttachments.length) {
            el.attachments.classList.remove('has-items');
            return;
        }
        el.attachments.classList.add('has-items');

        pendingAttachments.forEach(function (att, index) {
            const box = document.createElement('div');
            box.className = 'attach-item';

            const img = document.createElement('img');
            img.src = att.dataUrl;
            img.alt = att.name || '图片';
            box.appendChild(img);

            const btn = document.createElement('button');
            btn.className = 'attach-remove';
            btn.type = 'button';
            btn.textContent = '✕';
            btn.title = '移除';
            btn.addEventListener('click', function () {
                pendingAttachments.splice(index, 1);
                renderAttachments();
            });
            box.appendChild(btn);

            el.attachments.appendChild(box);
        });
    }

    function compressImage(file, maxSize) {
        maxSize = maxSize || 1024;
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onerror = function () { reject(new Error('读取图片失败')); };
            reader.onload = function () {
                const img = new Image();
                img.onerror = function () { reject(new Error('解析图片失败')); };
                img.onload = function () {
                    let w = img.naturalWidth || img.width;
                    let h = img.naturalHeight || img.height;
                    const longest = Math.max(w, h);
                    if (longest > maxSize) {
                        const scale = maxSize / longest;
                        w = Math.round(w * scale);
                        h = Math.round(h * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);

                    const isPng = file.type === 'image/png';
                    let dataUrl;
                    try {
                        dataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85);
                    } catch (e) {
                        dataUrl = reader.result;
                    }
                    resolve({ name: file.name, dataUrl: dataUrl });
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function handleFiles(fileList) {
        const files = Array.prototype.slice.call(fileList || []);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (!/^image\//.test(f.type)) continue;
            if (pendingAttachments.length >= 4) {
                setHint('一次最多发送 4 张图片');
                break;
            }
            try {
                const att = await compressImage(f);
                pendingAttachments.push(att);
            } catch (e) {
                console.warn('图片处理失败', e);
            }
        }
        renderAttachments();
    }

    /* ---------------- 状态提示 ---------------- */

    function setHint(text) {
        el.typingHint.textContent = text || '';
    }

    function setBusy(v) {
        busy = v;
        el.btnSend.disabled = v;
        el.btnImage.disabled = v;
        if (!v) setHint('');
    }

    /* ---------------- 联网搜索 ---------------- */

    function normalizeResults(list) {
        if (!list) return [];
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (e) { return []; }
        }
        if (list.results) list = list.results;
        if (!Array.isArray(list)) return [];
        return list.slice(0, 10).map(function (r) {
            return {
                title: r.title || r.name || '',
                url: r.url || r.link || '',
                snippet: r.snippet || r.content || r.description || r.text || ''
            };
        }).filter(function (r) { return r.title || r.snippet; });
    }

    function doSearch(query) {
        return new Promise(function (resolve) {
            const provider = settings.searchProvider;
            if (!provider || provider === 'off' || !query) { resolve([]); return; }
            const max = settings.searchMax || 5;

            /* 通道 1：交给宿主（C# / WebView2） */
            if (provider === 'webview') {
                const wv = window.chrome && window.chrome.webview;
                if (!wv || typeof wv.postMessage !== 'function') {
                    console.warn('当前环境没有 WebView2，搜索通道回退为空');
                    resolve([]);
                    return;
                }
                const id = nowId();
                let settled = false;

                const timer = setTimeout(function () {
                    if (settled) return;
                    settled = true;
                    delete pendingSearch[id];
                    resolve([]);
                }, SEARCH_TIMEOUT);

                pendingSearch[id] = function (results) {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    resolve(normalizeResults(results));
                };

                try {
                    wv.postMessage({
                        type: 'search',
                        id: id,
                        query: query,
                        max: max,
                        character: character.name || ''
                    });
                } catch (e) {
                    console.warn('向宿主发送搜索请求失败', e);
                    clearTimeout(timer);
                    delete pendingSearch[id];
                    resolve([]);
                }
                return;
            }

            /* 通道 2：SearXNG */
            if (provider === 'searxng') {
                const endpoint = (settings.searchEndpoint || '').replace(/\/+$/, '');
                if (!endpoint) { resolve([]); return; }
                const url = endpoint + '/search?q=' + encodeURIComponent(query) +
                    '&format=json&language=zh-CN&safesafe=0';
                fetch(url, { method: 'GET' })
                    .then(function (r) { return r.json(); })
                    .then(function (data) { resolve(normalizeResults(data)); })
                    .catch(function (e) { console.warn('SearXNG 搜索失败', e); resolve([]); });
                return;
            }

            /* 通道 3：Tavily */
            if (provider === 'tavily') {
                if (!settings.searchKey) { resolve([]); return; }
                fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: settings.searchKey,
                        query: query,
                        max_results: max,
                        search_depth: 'basic',
                        include_answer: false
                    })
                })
                    .then(function (r) { return r.json(); })
                    .then(function (data) { resolve(normalizeResults(data)); })
                    .catch(function (e) { console.warn('Tavily 搜索失败', e); resolve([]); });
                return;
            }

            resolve([]);
        });
    }

    /* ---------------- 模型请求（流式） ---------------- */

    async function requestChat(apiMessages, onDelta) {
        const url = chatEndpoint();
        const lastMsg = messages[messages.length - 1];
        const hasImage = !!(lastMsg && lastMsg.images && lastMsg.images.length);
        const model = hasImage ? (settings.visionModel || settings.model) : settings.model;

        const headers = { 'Content-Type': 'application/json' };
        if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

        const payload = {
            model: model,
            messages: apiMessages,
            stream: true,
            temperature: 0.85
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let detail = '';
            try { detail = await res.text(); } catch (e) { detail = ''; }
            throw new Error('模型接口返回 ' + res.status + '：' + (detail || res.statusText));
        }

        if (!res.body || typeof res.body.getReader !== 'function') {
            const data = await res.json();
            const text = (data.choices && data.choices[0] && data.choices[0].message &&
                data.choices[0].message.content) || '';
            if (text) onDelta(text);
            return text;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let full = '';

        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;

            buffer += decoder.decode(chunk.value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.indexOf('data:') !== 0) continue;
                const data = line.slice(5).trim();
                if (data === '[DONE]') continue;
                try {
                    const json = JSON.parse(data);
                    const choice = json.choices && json.choices[0];
                    if (!choice) continue;
                    const delta = choice.delta || choice.message || {};
                    const piece = delta.content;
                    if (piece) {
                        full += piece;
                        onDelta(full);
                    }
                } catch (e) { /* 忽略无法解析的分片 */ }
            }
        }

        return full;
    }

    /* ---------------- 对话主流程 ---------------- */

    async function send() {
        if (busy) return;

        const text = el.input.value.trim();
        if (!text && pendingAttachments.length === 0) return;

        const imgs = pendingAttachments.slice();
        pendingAttachments = [];
        renderAttachments();

        el.input.value = '';
        autoResize();

        addMessageElement('user', text, imgs);
        messages.push({ role: 'user', content: text, images: imgs });

        await respond();
    }

    async function respond() {
        const lastUser = messages[messages.length - 1];
        if (!lastUser || lastUser.role !== 'user') return;

        setBusy(true);
        let bubble = null;

        try {
            let searchContext = '';
            if (searchEnabled && lastUser.content) {
                setHint('正在联网搜索…');
                const results = await doSearch(lastUser.content);
                if (results && results.length) {
                    searchContext = formatSearchContext(results);
                }
            }

            setHint('正在思考…');
            const apiMessages = buildApiMessages(searchContext);
            bubble = createAssistantBubble();

            const node = bubble;
            const reply = await requestChat(apiMessages, function (partial) {
                updateAssistantBubble(node, partial);
            });

            let finalText = (reply || '').trim();
            if (!finalText) finalText = '……';

            updateAssistantBubble(node, finalText);
            messages.push({ role: 'assistant', content: finalText });

        } catch (err) {
            console.error(err);
            const errText = '（' + (err && err.message ? err.message : '请求出错了') + '）';
            if (bubble) {
                updateAssistantBubble(bubble, errText);
            } else {
                addMessageElement('assistant', errText, null);
            }
        } finally {
            setBusy(false);
            el.input.focus();
        }
    }

    function clearChat() {
        messages = [];
        el.messages.innerHTML = '';

        // 重建空状态
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.id = 'empty-state';
        empty.innerHTML =
            '<div class="empty-glyph">東方Project</div>' +
            '<p class="empty-title"></p>' +
            '<p class="empty-sub">说点什么，开始这段对话吧。</p>';
        el.messages.appendChild(empty);
        el.emptyState = empty;
        updateEmptyState();

        pendingAttachments = [];
        renderAttachments();
    }

    /* ---------------- 输入框自适应 ---------------- */

    function autoResize() {
        el.input.style.height = 'auto';
        const h = Math.min(160, Math.max(38, el.input.scrollHeight));
        el.input.style.height = h + 'px';
    }

    /* ---------------- 设置面板 ---------------- */

    function openSettings() {
        fillSettingsForm();
        el.settingsMask.classList.remove('hidden');
        el.settingsPanel.classList.remove('hidden');
    }

    function closeSettings() {
        el.settingsMask.classList.add('hidden');
        el.settingsPanel.classList.add('hidden');
    }

    function commitSettings() {
        readSettingsForm();
        if (!saveSettings()) {
            setHint('设置保存失败：背景图可能过大');
        }
        applyBackground();
        rebuildCharacter();
        applyCharacter();
        updateSearchButton();
        closeSettings();
    }

    /* ---------------- 搜索开关 ---------------- */

    function updateSearchButton() {
        el.btnSearchToggle.classList.toggle('active', searchEnabled);
        el.btnSearchToggle.title = searchEnabled ? '联网搜索：开' : '联网搜索：关';
    }

    function setSearchEnabled(v) {
        searchEnabled = !!v;
        updateSearchButton();
    }

    /* ---------------- 事件绑定 ---------------- */

    function bindEvents() {
        el.btnClear.addEventListener('click', clearChat);
        el.btnSettings.addEventListener('click', openSettings);

        el.btnSearchToggle.addEventListener('click', function () {
            setSearchEnabled(!searchEnabled);
            setHint(searchEnabled ? '联网搜索已开启' : '联网搜索已关闭');
            setTimeout(function () { if (!busy) setHint(''); }, 1600);
        });

        el.btnSend.addEventListener('click', send);

        el.input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                send();
            }
        });
        el.input.addEventListener('input', autoResize);

        el.btnImage.addEventListener('click', function () { el.fileInput.click(); });
        el.fileInput.addEventListener('change', function () {
            handleFiles(el.fileInput.files);
            el.fileInput.value = '';
        });

        el.input.addEventListener('paste', function (e) {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type && items[i].type.indexOf('image') === 0) {
                    const f = items[i].getAsFile();
                    if (f) files.push(f);
                }
            }
            if (files.length) {
                e.preventDefault();
                handleFiles(files);
            }
        });

        document.addEventListener('dragover', function (e) { e.preventDefault(); });
        document.addEventListener('drop', function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
            }
        });

        el.btnSettingsClose.addEventListener('click', closeSettings);
        el.settingsMask.addEventListener('click', closeSettings);
        el.btnSaveSettings.addEventListener('click', commitSettings);

        el.cfgBgDim.addEventListener('input', function () {
            el.bgDimVal.textContent = el.cfgBgDim.value + '%';
            el.bgDim.style.opacity = String((parseInt(el.cfgBgDim.value, 10) || 0) / 100);
        });

        el.btnBgFile.addEventListener('click', function () { el.bgFileInput.click(); });
        el.bgFileInput.addEventListener('change', function () {
            const f = el.bgFileInput.files && el.bgFileInput.files[0];
            el.bgFileInput.value = '';
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function () {
                settings.bgUrl = reader.result;
                applyBackground();
                el.cfgBgUrl.value = '';
                setHint('背景已应用，点击"保存设置"可持久化（大图可能失败）');
                setTimeout(function () { if (!busy) setHint(''); }, 2600);
            };
            reader.readAsDataURL(f);
        });

        el.btnBgClear.addEventListener('click', function () {
            settings.bgUrl = '';
            el.cfgBgUrl.value = '';
            applyBackground();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !el.settingsPanel.classList.contains('hidden')) {
                closeSettings();
            }
        });

        /* 监听 WebView2 宿主消息 */
        if (window.chrome && window.chrome.webview && window.chrome.webview.addEventListener) {
            window.chrome.webview.addEventListener('message', function (evt) {
                handleHostMessage(evt.data);
            });
        }

        /* 兼容某些宿主用 window.postMessage 传数据 */
        window.addEventListener('message', function (evt) {
            if (evt && evt.data && typeof evt.data === 'object' && evt.data.type) {
                handleHostMessage(evt.data);
            }
        });
    }

    function handleHostMessage(raw) {
        if (!raw) return;
        let msg = raw;
        if (typeof msg === 'string') {
            try { msg = JSON.parse(msg); } catch (e) { return; }
        }
        if (!msg || typeof msg !== 'object') return;

        switch (msg.type) {
            case 'setCharacter':
            case 'character':
                setCharacter(msg.data || msg);
                break;
            case 'sendMessage':
            case 'message':
                if (msg.text) window.chatPet.sendMessage(msg.text);
                break;
            case 'setSearchEnabled':
                setSearchEnabled(!!msg.value);
                break;
            case 'setBackground':
                settings.bgUrl = msg.url || '';
                applyBackground();
                break;
            case 'clear':
                clearChat();
                break;
            case 'searchResult':
                if (msg.id) window.chatPet.resolveSearch(msg.id, msg.results || []);
                break;
            default:
                break;
        }
    }

    /* ---------------- 初始化 ---------------- */

    function init() {
        el.bgLayer = $('bg-layer');
        el.bgDim = $('bg-dim');

        el.charAvatar = $('char-avatar');
        el.charAvatarImg = $('char-avatar-img');
        el.charAvatarFallback = $('char-avatar-fallback');
        el.charName = $('char-name');
        el.charTitle = $('char-title');

        el.btnSearchToggle = $('btn-search-toggle');
        el.btnClear = $('btn-clear');
        el.btnSettings = $('btn-settings');

        el.messages = $('messages');
        el.emptyState = $('empty-state');
        el.attachments = $('attachments');
        el.typingHint = $('typing-hint');

        el.btnImage = $('btn-image');
        el.fileInput = $('file-input');
        el.input = $('input');
        el.btnSend = $('btn-send');

        el.settingsMask = $('settings-mask');
        el.settingsPanel = $('settings-panel');
        el.btnSettingsClose = $('btn-settings-close');
        el.btnSaveSettings = $('btn-save-settings');

        el.cfgBaseUrl = $('cfg-base-url');
        el.cfgApiKey = $('cfg-api-key');
        el.cfgModel = $('cfg-model');
        el.cfgVisionModel = $('cfg-vision-model');
        el.cfgSearchProvider = $('cfg-search-provider');
        el.cfgSearchEndpoint = $('cfg-search-endpoint');
        el.cfgSearchKey = $('cfg-search-key');
        el.cfgSearchMax = $('cfg-search-max');

        el.btnBgFile = $('btn-bg-file');
        el.btnBgClear = $('btn-bg-clear');
        el.bgFileInput = $('bg-file-input');
        el.cfgBgUrl = $('cfg-bg-url');
        el.cfgBgDim = $('cfg-bg-dim');
        el.bgDimVal = $('bg-dim-val');

        el.cfgCharAvatar = $('cfg-char-avatar');
        el.cfgCharPersona = $('cfg-char-persona');

        loadSettings();
        applyBackground();

        rebuildCharacter();
        applyCharacter();
        updateEmptyState();

        fillSettingsForm();
        updateSearchButton();
        bindEvents();
        autoResize();

        el.input.focus();

        const params = new URLSearchParams(location.search);
        const petName = params.get('name');
        if (petName) {
            setCharacter({ name: petName });
        }
    }

    /* ---------------- 对外 API ---------------- */

    window.chatPet = {
        version: '2.0.0',

        /** 宿主传入角色信息 */
        setCharacter: setCharacter,

        getCharacter: function () {
            return {
                name: character.name,
                title: character.title,
                avatar: character.avatar,
                persona: character.persona
            };
        },

        setSearchEnabled: setSearchEnabled,
        isSearchEnabled: function () { return searchEnabled; },

        /** 主动发送一条消息（会走完整流程） */
        sendMessage: function (text) {
            if (typeof text !== 'string' || !text.trim()) return;
            el.input.value = text;
            autoResize();
            send();
        },

        /** 直接插入一条消息，不请求模型 */
        pushMessage: function (text, role) {
            const r = role === 'user' ? 'user' : 'assistant';
            addMessageElement(r, text, null);
            messages.push({ role: r, content: text });
        },

        clear: clearChat,
        openSettings: openSettings,

        setBackground: function (url) {
            settings.bgUrl = url || '';
            applyBackground();
            saveSettings();
        },

        /** 宿主回传搜索结果 */
        resolveSearch: function (id, results) {
            const fn = pendingSearch[id];
            if (fn) {
                delete pendingSearch[id];
                fn(results);
            }
        },

        getSettings: function () {
            return JSON.parse(JSON.stringify(settings));
        }
    };

    /* ---------------- 启动 ---------------- */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();