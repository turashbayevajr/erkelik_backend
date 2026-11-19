export type UILang = 'EN' | 'RU' | 'KK';

export const UI = {
  EN: {
    hello: (name?: string | null) =>
      `Welcome${name ? ', ' + escapePlain(name) : ''}!`,
    intro:
      '🎁 Erkelik is a wishlist right in Telegram.\n\n1. Add wishes — a photo or a link, and a price.\n2. Share the link to your wishlist with friends.\n3. Friends reserve gifts secretly — you won’t find out who picked what.',
    help: '❓ How it works\n\n• Add a wish: “➕ Add wish” or the ❤️ button below the chat. Every wish needs a photo or a link.\n• Share: /share gives you a link to your wishlist — send it to friends.\n• Secret: you never see who reserved your wishes or whether they are reserved. Friends see what is already taken, so gifts don’t repeat.\n• Who sees a wish: everyone, only friends, or chosen people — set it when adding a wish.\n• Subscribe to friends to get a message when they add something new.',
    shareLink: (link: string) =>
      `📤 Your wishlist link:\n${link}\n\nSend it to friends — it opens your wishlist.`,
    shareInvite: 'My wishlist on Erkelik — pick something to make me happy 🎁',
    needUsername:
      '❗ To share your wishlist, set a username in Telegram settings — friends find your list by it.',
    commands: {
      start: 'Start and main menu',
      menu: 'Main menu',
      share: 'Share my wishlist',
      help: 'How it works',
    },
    botDescription:
      'Erkelik is a wishlist in Telegram. Add what you dream of, share the link with friends — they reserve gifts secretly, and you get exactly what you wanted.',
    botShortDescription:
      'Wishlist in Telegram: add wishes, share with friends — they reserve gifts secretly.',
    menuTitle: 'Choose an action:',
    youHaveNoWishes: 'Your wishlist is empty.',
    userHasNoWishes: 'This user has no wishes yet.',
    userNotRegister: 'This user has not started using our bot yet.',
    userNotFound: 'User not found.',
    sendName: '✍️ Send a name for your wish.',
    sendPriceOrSkip: '💰 Send a price (e.g., 19990.50), or press “Skip”.',
    sendUrlOrPhoto:
      '🔗 Send a link to the item or a photo of it (you can send several photos). At least one of them is required.',
    photoAdded: (n: number, done: string) =>
      `📷 Photo added (${n}). Send more photos, a link, or press “${done}”.`,
    photoOrLinkRequired:
      '❗ A wish needs a photo or a link — send at least one of them.',
    photoFailed:
      '❗ Could not read the photo. Try another one (JPEG, PNG or WebP up to 10 MB).',
    tooManyPhotos: '❗ Up to 3 photos per wish.',
    sendDescriptionOrSkip:
      '📝 Send additional info (description) or press «Skip».',
    invalidPrice:
      '❗ Invalid price. Send a non-negative number up to 9 999 999 999, like 12000 or 199.99.',
    askUsername: '🔎 Send Telegram username (with or without @).',
    listTitleMine: '📜 Your wishes:',
    listTitleOthers: (u: string) => `📜 Wishes of @${u}:`,
    itemViewHeader: '🧾 Wish details',
    fieldName: 'Name',
    fieldPrice: 'Price',
    fieldUrl: 'URL',
    description: 'Additional',
    notSpecified: 'Not specified',
    saved: '✅ Changes saved.',
    itemNotFound: 'Item not found.',
    deleted: '🗑️ Deleted.',
    deletionCanceled: '❎ Deletion canceled.',
    reservedOk: '🔒 Reserved successfully.',
    selfReservedOk: '🔒 You marked your own wish as reserved.',
    status: 'Status',
    statusOpen: 'OPEN',
    statusReserved: 'RESERVED',
    statusOrdered: 'ORDERED',
    statusFulfilled: 'FULFILLED',
    owner: 'Owner',
    reservedBy: 'Reserved by',
    orderedBy: 'Ordered by',
    notifNewWish: (owner: string, wish: string) =>
      `🎁 ${owner} added a new wish: «${wish}»`,
    notifWishEdited: (wish: string) =>
      `✏️ The wish «${wish}» you reserved was edited by its owner — check the details.`,
    friendRequestFrom: (name: string) =>
      `🤝 ${name} wants to add you as a friend.`,
    noFriends: 'No friends yet — open someone’s wishlist and send a request.',
    noSubscriptions: 'No subscriptions yet — find a wishlist by @username.',

    buttons: {
      openApp: '📱 Open wishlist',
      openFriendApp: '📱 Open in the app',
      share: '📤 Share my wishlist',
      sendToFriend: '✉️ Send to a friend',
      help: '❓ How it works',
      editPhotos: '📷 Photos',
      clearPhotos: '🗑 Remove all photos',
      photosDone: '✅ Done',
      subscribe: '🔔 Subscribe',
      unsubscribe: '🔕 Unsubscribe',
      addFriend: '🤝 Add friend',
      acceptFriend: '✅ Accept request',
      add: '➕ Add',
      viewMine: '📜 View My Wishlist',
      viewOthers: '🔍 View Others',
      menu: '📲 Menu',
      skip: '⏭ Skip',
      edit: '📝 Edit',
      delete: '❌ Delete',
      yes: '✅ Yes',
      no: '❎ No',
      save: '💾 Save Changes',
      viewWish: '📄 View wish',
      editName: 'Name',
      editPrice: 'Price',
      editUrl: 'URL',
      editDescription: 'Additional',
      reserve: '🔒 Reserve',
      back: '↩️ Back',
      viewMyReservations: '🔒 My Reservations',
      friendsList: '👥 My Friends',
      subscriptionsList: '🔔 My Subscriptions',
      ordered: '✅ Already bought it',
      fullfilled: '✅ The wish has been fulfilled',
      unreserve: '🔓 Cancel reservation',
    },
    hints: {
      editPhotos: (n: number) =>
        `📷 Photos now: ${n}. Send new photos — they will be added (up to 3). To replace them, remove all first.`,
      photosCleared: (save: string) =>
        `🗑 Photos removed. Send new ones or press “${save}”.`,
      photoAddedEdit: (n: number, save: string) =>
        `📷 Photo added (${n}). Send more or press “${save}”.`,
      enterNewName: '✍️ Enter a new name.',
      enterNewPrice: '💰 Enter a new price (e.g., 19990.50).',
      enterNewUrl: '🔗 Enter a new URL (or “-” to clear).',
      enterNewDescription:
        'Write additional info (description). Send "-" to clear.',
      okPressSave: (saveLabel: string) =>
        `📝 OK — press “${saveLabel}” to apply.`,
    },
  },
  RU: {
    hello: (name?: string | null) =>
      `Добро пожаловать${name ? ', ' + escapePlain(name) : ''}!`,
    intro:
      '🎁 Erkelik — вишлист прямо в Telegram.\n\n1. Добавляйте желания — фото или ссылка и цена.\n2. Поделитесь ссылкой на свой вишлист с друзьями.\n3. Друзья бронируют подарки втайне — вы не узнаете, кто что выбрал.',
    help: '❓ Как это работает\n\n• Добавить желание: «➕ Добавить желание» или кнопка ❤️ под чатом. У желания должно быть фото или ссылка.\n• Поделиться: /share даст ссылку на ваш вишлист — отправьте её друзьям.\n• Тайна: вы не видите, кто забронировал ваши желания и забронированы ли они. Друзья видят, что уже занято, — подарки не повторятся.\n• Кто видит желание: все, только друзья или выбранные люди — это задаётся при добавлении.\n• Подпишитесь на друзей — придёт сообщение, когда они добавят что-то новое.',
    shareLink: (link: string) =>
      `📤 Ссылка на ваш вишлист:\n${link}\n\nОтправьте её друзьям — по ней откроется ваш вишлист.`,
    shareInvite: 'Мой вишлист в Erkelik — выбери, чем меня порадовать 🎁',
    needUsername:
      '❗ Чтобы делиться вишлистом, задайте username в настройках Telegram — по нему друзья найдут ваш список.',
    commands: {
      start: 'Начало и главное меню',
      menu: 'Главное меню',
      share: 'Поделиться вишлистом',
      help: 'Как это работает',
    },
    botDescription:
      'Erkelik — вишлист в Telegram. Добавляйте то, о чём мечтаете, делитесь ссылкой с друзьями — они бронируют подарки втайне, а вы получаете именно то, что хотели.',
    botShortDescription:
      'Вишлист в Telegram: добавляйте желания, делитесь с друзьями — они бронируют подарки втайне.',
    menuTitle: 'Выберите действие:',
    youHaveNoWishes: 'Ваш список желаний пуст.',
    userHasNoWishes: 'У пользователя пока нет желаний.',
    userNotFound: 'Пользователь не найден.',
    userNotRegister: 'Этот пользователь ещё не использует наш бот.',
    sendName: '✍️ Пришлите название желания.',
    sendPriceOrSkip:
      '💰 Пришлите цену (например, 19990.50) или нажмите «Пропустить».',
    sendUrlOrPhoto:
      '🔗 Пришлите ссылку на товар или его фото (можно несколько). Нужно хотя бы что-то одно.',
    photoAdded: (n: number, done: string) =>
      `📷 Фото добавлено (${n}). Пришлите ещё фото, ссылку или нажмите «${done}».`,
    photoOrLinkRequired:
      '❗ У желания должно быть фото или ссылка — пришлите хотя бы одно.',
    photoFailed:
      '❗ Не удалось прочитать фото. Попробуйте другое (JPEG, PNG или WebP до 10 МБ).',
    tooManyPhotos: '❗ Не больше 3 фото на желание.',
    sendDescriptionOrSkip:
      '📝 Отправьте дополнительную информацию (описание) или нажмите «Пропустить».',
    invalidPrice:
      '❗ Некорректная цена. Пришлите неотрицательное число не больше 9 999 999 999, например 12000 или 199.99.',
    askUsername: '🔎 Пришлите Telegram username (с @ или без).',
    listTitleMine: '📜 Ваши желания:',
    listTitleOthers: (u: string) => `📜 Желания пользователя @${u}:`,
    itemViewHeader: '🧾 Детали желания',
    fieldName: 'Название',
    fieldPrice: 'Цена',
    fieldUrl: 'Ссылка',
    description: 'Дополнительно',
    notSpecified: 'Не указано',
    saved: '✅ Изменения сохранены.',
    itemNotFound: 'Элемент не найден.',
    deleted: '🗑️ Удалено.',
    deletionCanceled: '❎ Удаление отменено.',
    reservedOk: '🔒 Успешно зарезервировано.',
    selfReservedOk: '🔒 Вы отметили своё желание как зарезервированное.',
    status: 'Статус',
    statusOpen: 'Открыто',
    statusReserved: 'Зарезервировано',
    statusOrdered: 'Куплено',
    statusFulfilled: 'Исполнено',
    owner: 'Владелец',
    reservedBy: 'Кем зарезервировано',
    orderedBy: 'Кем куплено',
    notifNewWish: (owner: string, wish: string) =>
      `🎁 ${owner} добавил(а) новое желание: «${wish}»`,
    notifWishEdited: (wish: string) =>
      `✏️ Желание «${wish}», которое вы забронировали, изменено владельцем — загляните в детали.`,
    friendRequestFrom: (name: string) =>
      `🤝 ${name} хочет добавить вас в друзья.`,
    noFriends:
      'Друзей пока нет — откройте чей-нибудь вишлист и отправьте заявку.',
    noSubscriptions: 'Подписок пока нет — найдите вишлист по @username.',

    buttons: {
      openApp: '📱 Открыть вишлист',
      openFriendApp: '📱 Открыть в приложении',
      share: '📤 Поделиться вишлистом',
      sendToFriend: '✉️ Отправить другу',
      help: '❓ Как это работает',
      editPhotos: '📷 Фото',
      clearPhotos: '🗑 Удалить все фото',
      photosDone: '✅ Готово',
      subscribe: '🔔 Подписаться',
      unsubscribe: '🔕 Отписаться',
      addFriend: '🤝 В друзья',
      acceptFriend: '✅ Принять заявку',
      add: '➕ Добавить',
      viewMine: '📜 Мои желания',
      viewOthers: '🔍 Посмотреть других',
      menu: '📲 Меню',
      skip: '⏭ Пропустить',
      edit: '📝 Редактировать',
      delete: '❌ Удалить',
      yes: '✅ Да',
      no: '❎ Нет',
      save: '💾 Сохранить',
      viewWish: '📄 Открыть карточку',
      editName: 'Название',
      editPrice: 'Цена',
      editUrl: 'Ссылка',
      editDescription: 'Дополнительно',
      reserve: '🔒 Зарезервировать',
      back: '↩️ Назад',
      viewMyReservations: '🔒 Мои брони',
      friendsList: '👥 Мои друзья',
      subscriptionsList: '🔔 Мои подписки',
      ordered: '✅ Уже куплено',
      fullfilled: '✅ Желание исполнилось',
      unreserve: '🔓 Снять бронь',
    },
    hints: {
      editPhotos: (n: number) =>
        `📷 Сейчас фото: ${n}. Пришлите новые — они добавятся (до 3). Чтобы заменить, сначала удалите все.`,
      photosCleared: (save: string) =>
        `🗑 Фото убраны. Пришлите новые или нажмите «${save}».`,
      photoAddedEdit: (n: number, save: string) =>
        `📷 Фото добавлено (${n}). Пришлите ещё или нажмите «${save}».`,
      enterNewName: '✍️ Введите новое название.',
      enterNewPrice: '💰 Введите новую цену (например, 19990.50).',
      enterNewUrl: '🔗 Введите новый URL (или «-» чтобы очистить).',
      enterNewDescription:
        'Напишите дополнительную информацию (описание). Чтобы очистить, отправьте "-".',
      okPressSave: (saveLabel: string) =>
        `📝 ОК — нажмите «${saveLabel}», чтобы применить.`,
    },
  },
  KK: {
    hello: (name?: string | null) =>
      `Қош келдіңіз${name ? ', ' + escapePlain(name) : ''}!`,
    intro:
      '🎁 Erkelik — Telegram ішіндегі тілектер тізімі.\n\n1. Тілек қосыңыз — фото немесе сілтеме және баға.\n2. Тізіміңіздің сілтемесін достарыңызбен бөлісіңіз.\n3. Достарыңыз сыйлықты жасырын брондайды — кім не таңдағанын білмейсіз.',
    help: '❓ Бұл қалай жұмыс істейді\n\n• Тілек қосу: «➕ Тілек қосу» немесе чат астындағы ❤️ батырмасы. Тілекте фото немесе сілтеме болуы керек.\n• Бөлісу: /share тізіміңіздің сілтемесін береді — оны достарыңызға жіберіңіз.\n• Құпия: тілектеріңізді кім брондағанын және брондалғанын көрмейсіз. Достарыңыз не алынғанын көреді — сыйлықтар қайталанбайды.\n• Тілекті кім көреді: барлығы, тек достар немесе таңдалған адамдар — қосқанда белгіленеді.\n• Достарыңызға жазылыңыз — олар жаңа тілек қосқанда хабар келеді.',
    shareLink: (link: string) =>
      `📤 Тізіміңіздің сілтемесі:\n${link}\n\nОны достарыңызға жіберіңіз — сілтеме арқылы тізіміңіз ашылады.`,
    shareInvite:
      'Erkelik-тегі тілектер тізімім — мені немен қуантатыныңды таңда 🎁',
    needUsername:
      '❗ Тізіммен бөлісу үшін Telegram баптауларында username орнатыңыз — достарыңыз тізіміңізді сол арқылы табады.',
    commands: {
      start: 'Бастау және басты мәзір',
      menu: 'Басты мәзір',
      share: 'Тізіммен бөлісу',
      help: 'Бұл қалай жұмыс істейді',
    },
    botDescription:
      'Erkelik — Telegram-дағы тілектер тізімі. Армандарыңызды қосыңыз, сілтемені достарыңызбен бөлісіңіз — олар сыйлықты жасырын брондайды, ал сіз қалағаныңызды аласыз.',
    botShortDescription:
      'Telegram-дағы тілектер тізімі: тілек қосыңыз, достарыңызбен бөлісіңіз — олар сыйлықты жасырын брондайды.',
    menuTitle: 'Әрекет таңдаңыз:',
    youHaveNoWishes: 'Сіздің еркелік тізіміңіз бос.',
    userHasNoWishes: 'Бұл пайдаланушыда әзірге еркелік жоқ.',
    userNotFound: 'Пайдаланушы табылмады.',
    userNotRegister: 'Бұл қолданушы біздің ботты әлі қолданбайды.',
    sendName: '✍️ Еркелік атауын жіберіңіз.',
    sendPriceOrSkip:
      '💰 Бағаны жіберіңіз (мысалы, 19990.50) немесе «Өткізу» батырмасын басыңыз.',
    sendUrlOrPhoto:
      '🔗 Тауардың сілтемесін немесе фотосын жіберіңіз (бірнешеуін жіберуге болады). Кемінде біреуі қажет.',
    photoAdded: (n: number, done: string) =>
      `📷 Фото қосылды (${n}). Тағы фото, сілтеме жіберіңіз немесе «${done}» батырмасын басыңыз.`,
    photoOrLinkRequired:
      '❗ Тілекте фото немесе сілтеме болуы керек — кемінде біреуін жіберіңіз.',
    photoFailed:
      '❗ Фотоны оқу мүмкін болмады. Басқасын жіберіп көріңіз (10 МБ-қа дейінгі JPEG, PNG немесе WebP).',
    tooManyPhotos: '❗ Бір тілекке 3 фотодан аспауы керек.',
    sendDescriptionOrSkip:
      '📝 Қосымша ақпаратты (сипаттаманы) жіберіңіз немесе «Өткізу» батырмасын басыңыз.',
    invalidPrice:
      '❗ Дұрыс емес баға. 9 999 999 999-дан аспайтын теріс емес сан жіберіңіз, мысалы 12000 немесе 199.99.',
    askUsername: '🔎 Telegram пайдаланушы атын жіберіңіз.',
    listTitleMine: '📜 Сіздің еркеліктеріңіз:',
    listTitleOthers: (u: string) => `📜 @${u} еркеліктері:`,
    itemViewHeader: '🧾 Еркелік детальдары',
    fieldName: 'Атауы',
    fieldPrice: 'Бағасы',
    fieldUrl: 'Сілтеме',
    description: 'Қосымша Ақпарат',
    notSpecified: 'Көрсетілмеген',
    saved: '✅ Өзгерістер сақталды.',
    itemNotFound: 'Элемент табылмады.',
    deleted: '🗑️ Жойылды.',
    deletionCanceled: '❎ Жою болдырылмады.',
    reservedOk: '🔒 Сәтті брондалды.',
    selfReservedOk: '🔒 Өз тялігіңізді бронь ретінде белгіледіңіз.',
    status: 'Мәртебе',
    statusOpen: 'Ашық',
    statusReserved: 'Броньдалған',
    statusOrdered: 'Сатып алынды',
    statusFulfilled: 'Орындалды',
    owner: 'Иесі',
    reservedBy: 'Кім броньдады',
    orderedBy: 'Кім сатып алды',
    notifNewWish: (owner: string, wish: string) =>
      `🎁 ${owner} жаңа тілек қосты: «${wish}»`,
    notifWishEdited: (wish: string) =>
      `✏️ Сіз броньдаған «${wish}» тілегін иесі өзгертті — егжей-тегжейін қараңыз.`,
    friendRequestFrom: (name: string) =>
      `🤝 ${name} сізді досқа қосқысы келеді.`,
    noFriends:
      'Әзірге достар жоқ — біреудің тілектер тізімін ашып, өтінім жіберіңіз.',
    noSubscriptions: 'Әзірге жазылымдар жоқ — @username арқылы тізім табыңыз.',
    buttons: {
      openApp: '📱 Еркелікті ашу',
      openFriendApp: '📱 Қолданбада ашу',
      share: '📤 Тізіммен бөлісу',
      sendToFriend: '✉️ Досқа жіберу',
      help: '❓ Бұл қалай жұмыс істейді',
      editPhotos: '📷 Фото',
      clearPhotos: '🗑 Барлық фотоны өшіру',
      photosDone: '✅ Дайын',
      subscribe: '🔔 Жазылу',
      unsubscribe: '🔕 Жазылудан бас тарту',
      addFriend: '🤝 Досқа қосу',
      acceptFriend: '✅ Өтінімді қабылдау',
      add: '➕ Қосу',
      viewMine: '📜 Менің тізімім',
      viewOthers: '🔍 Басқаларды көру',
      menu: '📲 Мәзір',
      skip: '⏭ Өткізу',
      edit: '📝 Өңдеу',
      delete: '❌ Жою',
      yes: '✅ Иә',
      no: '❎ Жоқ',
      save: '💾 Сақтау',
      viewWish: '📄 Карточканы ашу',
      editName: 'Атауы',
      editPrice: 'Бағасы',
      editUrl: 'Сілтеме',
      editDescription: 'Қосымша',
      reserve: '🔒 Брондау',
      back: '↩️ Артқа',
      viewMyReservations: '🔒 Менің броньдарым',
      friendsList: '👥 Менің достарым',
      subscriptionsList: '🔔 Менің жазылымдарым',
      ordered: '✅ Сатып алынды',
      fullfilled: '✅ Еркелігім орындалды',
      unreserve: '🔓 Броньды алып тастау',
    },
    hints: {
      editPhotos: (n: number) =>
        `📷 Қазір фото: ${n}. Жаңаларын жіберіңіз — олар қосылады (3-ке дейін). Ауыстыру үшін алдымен барлығын өшіріңіз.`,
      photosCleared: (save: string) =>
        `🗑 Фото өшірілді. Жаңаларын жіберіңіз немесе «${save}» батырмасын басыңыз.`,
      photoAddedEdit: (n: number, save: string) =>
        `📷 Фото қосылды (${n}). Тағы жіберіңіз немесе «${save}» батырмасын басыңыз.`,
      enterNewName: '✍️ Жаңа атауды енгізіңіз.',
      enterNewPrice: '💰 Жаңа бағаны енгізіңіз (мысалы, 19990.50).',
      enterNewUrl: '🔗 Жаңа URL енгізіңіз (немесе «-» — тазарту).',
      enterNewDescription:
        'Қосымша ақпаратты (сипаттама) жазыңыз. Тазарту үшін "-" жіберіңіз.',
      okPressSave: (saveLabel: string) =>
        `📝 ОК — өзгерістерді қолдану үшін «${saveLabel}» батырмасын басыңыз.`,
    },
  },
} as const;

function escapePlain(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}
