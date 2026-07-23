// Sprachpakete für den Umfeld-Bericht und die Notfallkarte (de/en/fr).
// Die Eltern-Freitexte werden NICHT übersetzt (sie schreiben in der
// Zielsprache); übersetzt werden Struktur, Ereignisarten, Erste-Hilfe-
// Schritte und Kurzanweisungen. {name} wird zur Laufzeit ersetzt.
import type { CareReportLanguage } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';

export type { CareReportLanguage };

export const LANGUAGE_LABEL: Record<CareReportLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  tr: 'Türkçe',
  ar: 'العربية',
  uk: 'Українська',
  es: 'Español',
};

/** Schreibrichtung der Sprache (Arabisch = rechts nach links) */
export function langDir(lang: CareReportLanguage): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export interface ReportStrings {
  title: string;
  subtitle: string;
  about: string;
  howItLooks: string;
  inTheMoment: string;
  agreedWithDoctor: string;
  firstAidDisclaimer: string;
  emergencyMeds: string;
  emergencyMedsNote: string;
  allergies: string;
  everyday: string;
  helps: string;
  avoid: string;
  triggersTitle: string;
  triggersNote: string;
  frequencyTitle: string;
  freqNone: string;
  freqSome: string;
  freqFreeDays: string;
  contact: string;
  footer: string;
  livesWith: string;
  cardTitle: string;
  cardMed: string;
  cardContact: string;
}

export const REPORT_STRINGS: Record<CareReportLanguage, ReportStrings> = {
  de: {
    title: 'So könnt ihr {name} unterstützen',
    subtitle:
      'Für Schule, Betreuung, Familie und Freunde — von den Angehörigen erstellt am {date}. Kein medizinisches Dokument; Grundlage für gutes Zusammenspiel.',
    about: 'Worum es geht',
    howItLooks: 'So kann es aussehen',
    inTheMoment: 'Was in dem Moment hilft',
    agreedWithDoctor: 'Individuell mit dem Arzt vereinbart',
    firstAidDisclaimer:
      'Allgemeine Erste-Hilfe-Grundregeln — individuelle ärztliche Anweisungen gehen immer vor.',
    emergencyMeds: 'Notfallmedikation',
    emergencyMedsNote:
      'Nur nach Absprache mit den Angehörigen bzw. laut vereinbartem Vorgehen geben.',
    allergies: 'Allergien & Unverträglichkeiten',
    everyday: 'Im Alltag',
    helps: 'Das hilft',
    avoid: 'Bitte vermeiden',
    triggersTitle: 'Häufig dokumentierte Begleitumstände',
    triggersNote: 'Beobachtungen der Angehörigen — kein Auslöser-Beweis.',
    frequencyTitle: 'Aktuelle Lage in Kürze',
    freqNone: 'Letzte 4 Wochen: kein dokumentiertes Ereignis',
    freqSome: 'Letzte 4 Wochen: {n} dokumentierte Ereignisse',
    freqFreeDays: 'aktuell {n} Tage ohne Ereignis',
    contact: 'Kontakt für Rückfragen',
    footer:
      'Erstellt mit care-diary — die Daten bleiben auf dem Gerät der Familie. Bitte vertraulich behandeln und nicht weitergeben.',
    livesWith: '{name} lebt mit: {condition}.',
    cardTitle: 'NOTFALL-INFO',
    cardMed: 'Notfallmedikament',
    cardContact: 'Kontakt',
  },
  en: {
    title: 'How you can support {name}',
    subtitle:
      'For school, caregivers, family and friends — created by the family on {date}. Not a medical document; a basis for working together.',
    about: 'What this is about',
    howItLooks: 'What it can look like',
    inTheMoment: 'What helps in the moment',
    agreedWithDoctor: 'Individually agreed with the doctor',
    firstAidDisclaimer:
      'General first-aid principles — individual medical instructions always take precedence.',
    emergencyMeds: 'Emergency medication',
    emergencyMedsNote: 'Give only as agreed with the family or according to the agreed plan.',
    allergies: 'Allergies & intolerances',
    everyday: 'In everyday life',
    helps: 'This helps',
    avoid: 'Please avoid',
    triggersTitle: 'Frequently documented circumstances',
    triggersNote: 'Family observations — not proof of a trigger.',
    frequencyTitle: 'Current situation at a glance',
    freqNone: 'Last 4 weeks: no documented episode',
    freqSome: 'Last 4 weeks: {n} documented episodes',
    freqFreeDays: 'currently {n} days without an episode',
    contact: 'Contact for questions',
    footer:
      'Created with care-diary — all data stays on the family’s device. Please treat confidentially and do not share.',
    livesWith: '{name} lives with: {condition}.',
    cardTitle: 'EMERGENCY INFO',
    cardMed: 'Emergency medication',
    cardContact: 'Contact',
  },
  fr: {
    title: 'Comment soutenir {name}',
    subtitle:
      'Pour l’école, les encadrants, la famille et les amis — établi par la famille le {date}. Pas un document médical ; une base pour bien coopérer.',
    about: 'De quoi il s’agit',
    howItLooks: 'À quoi cela peut ressembler',
    inTheMoment: 'Ce qui aide sur le moment',
    agreedWithDoctor: 'Convenu individuellement avec le médecin',
    firstAidDisclaimer:
      'Principes généraux de premiers secours — les consignes médicales individuelles priment toujours.',
    emergencyMeds: 'Médicament d’urgence',
    emergencyMedsNote: 'À donner uniquement en accord avec la famille ou selon le plan convenu.',
    allergies: 'Allergies et intolérances',
    everyday: 'Au quotidien',
    helps: 'Ce qui aide',
    avoid: 'À éviter',
    triggersTitle: 'Circonstances fréquemment documentées',
    triggersNote: 'Observations de la famille — pas une preuve de déclencheur.',
    frequencyTitle: 'Situation actuelle en bref',
    freqNone: '4 dernières semaines : aucun épisode documenté',
    freqSome: '4 dernières semaines : {n} épisodes documentés',
    freqFreeDays: 'actuellement {n} jours sans épisode',
    contact: 'Contact pour toute question',
    footer:
      'Créé avec care-diary — les données restent sur l’appareil de la famille. À traiter de manière confidentielle, ne pas diffuser.',
    livesWith: '{name} vit avec : {condition}.',
    cardTitle: 'INFO URGENCE',
    cardMed: 'Médicament d’urgence',
    cardContact: 'Contact',
  },
  tr: {
    title: '{name} için böyle destek olabilirsiniz',
    subtitle:
      'Okul, bakım, aile ve arkadaşlar için — aile tarafından {date} tarihinde hazırlandı. Tıbbi bir belge değildir; iyi bir iş birliği için temeldir.',
    about: 'Konu nedir',
    howItLooks: 'Nasıl görünebilir',
    inTheMoment: 'O anda ne yardımcı olur',
    agreedWithDoctor: 'Doktorla özel olarak kararlaştırıldı',
    firstAidDisclaimer:
      'Genel ilk yardım kuralları — kişiye özel tıbbi talimatlar her zaman önceliklidir.',
    emergencyMeds: 'Acil durum ilacı',
    emergencyMedsNote: 'Yalnızca aile ile mutabık kalınarak veya kararlaştırılan plana göre verin.',
    allergies: 'Alerjiler ve intoleranslar',
    everyday: 'Günlük yaşamda',
    helps: 'Bunlar yardımcı olur',
    avoid: 'Lütfen kaçının',
    triggersTitle: 'Sık belgelenen koşullar',
    triggersNote: 'Ailenin gözlemleri — tetikleyici kanıtı değildir.',
    frequencyTitle: 'Güncel durum kısaca',
    freqNone: 'Son 4 hafta: belgelenmiş atak yok',
    freqSome: 'Son 4 hafta: {n} belgelenmiş atak',
    freqFreeDays: 'şu anda {n} gündür ataksız',
    contact: 'Sorular için iletişim',
    footer:
      'care-diary ile oluşturuldu — veriler ailenin cihazında kalır. Lütfen gizli tutun ve paylaşmayın.',
    livesWith: '{name} şununla yaşıyor: {condition}.',
    cardTitle: 'ACİL DURUM BİLGİSİ',
    cardMed: 'Acil durum ilacı',
    cardContact: 'İletişim',
  },
  ar: {
    title: 'هكذا يمكنكم دعم {name}',
    subtitle:
      'للمدرسة والرعاية والعائلة والأصدقاء — أعدّته العائلة بتاريخ {date}. ليس وثيقة طبية؛ بل أساس لتعاون جيد.',
    about: 'ما الموضوع',
    howItLooks: 'كيف قد يبدو الأمر',
    inTheMoment: 'ما الذي يساعد في تلك اللحظة',
    agreedWithDoctor: 'مُتفق عليه بشكل فردي مع الطبيب',
    firstAidDisclaimer:
      'قواعد عامة للإسعافات الأولية — التعليمات الطبية الفردية لها الأولوية دائمًا.',
    emergencyMeds: 'دواء الطوارئ',
    emergencyMedsNote: 'يُعطى فقط بالاتفاق مع العائلة أو وفق الخطة المتفق عليها.',
    allergies: 'الحساسية وعدم التحمل',
    everyday: 'في الحياة اليومية',
    helps: 'هذا يساعد',
    avoid: 'يُرجى تجنّب',
    triggersTitle: 'الظروف المرافقة الموثّقة كثيرًا',
    triggersNote: 'ملاحظات العائلة — ليست دليلًا على مسبب.',
    frequencyTitle: 'الوضع الحالي باختصار',
    freqNone: 'آخر 4 أسابيع: لا نوبات موثّقة',
    freqSome: 'آخر 4 أسابيع: {n} نوبات موثّقة',
    freqFreeDays: 'حاليًا {n} أيام بدون نوبة',
    contact: 'جهة الاتصال للاستفسارات',
    footer:
      'أُنشئ بواسطة care-diary — تبقى البيانات على جهاز العائلة. يُرجى التعامل معه بسرية وعدم مشاركته.',
    livesWith: '{name} يعيش مع: {condition}.',
    cardTitle: 'معلومات الطوارئ',
    cardMed: 'دواء الطوارئ',
    cardContact: 'جهة الاتصال',
  },
  uk: {
    title: 'Як ви можете підтримати {name}',
    subtitle:
      'Для школи, доглядальників, родини та друзів — підготовлено родиною {date}. Це не медичний документ, а основа для доброї співпраці.',
    about: 'Про що йдеться',
    howItLooks: 'Як це може виглядати',
    inTheMoment: 'Що допомагає в цей момент',
    agreedWithDoctor: 'Індивідуально погоджено з лікарем',
    firstAidDisclaimer:
      'Загальні правила першої допомоги — індивідуальні медичні вказівки завжди мають пріоритет.',
    emergencyMeds: 'Невідкладні ліки',
    emergencyMedsNote: 'Давати лише за домовленістю з родиною або згідно з узгодженим планом.',
    allergies: 'Алергії та непереносимості',
    everyday: 'У повсякденні',
    helps: 'Це допомагає',
    avoid: 'Будь ласка, уникайте',
    triggersTitle: 'Часто задокументовані обставини',
    triggersNote: 'Спостереження родини — не доказ причини.',
    frequencyTitle: 'Поточна ситуація коротко',
    freqNone: 'Останні 4 тижні: жодного задокументованого епізоду',
    freqSome: 'Останні 4 тижні: {n} задокументованих епізодів',
    freqFreeDays: 'наразі {n} днів без епізоду',
    contact: 'Контакт для запитань',
    footer:
      'Створено за допомогою care-diary — дані залишаються на пристрої родини. Будь ласка, зберігайте конфіденційність і не передавайте далі.',
    livesWith: '{name} живе з: {condition}.',
    cardTitle: 'ЕКСТРЕНА ІНФОРМАЦІЯ',
    cardMed: 'Невідкладні ліки',
    cardContact: 'Контакт',
  },
  es: {
    title: 'Cómo podéis apoyar a {name}',
    subtitle:
      'Para la escuela, cuidadores, familia y amistades — elaborado por la familia el {date}. No es un documento médico; es una base para colaborar bien.',
    about: 'De qué se trata',
    howItLooks: 'Cómo puede verse',
    inTheMoment: 'Qué ayuda en el momento',
    agreedWithDoctor: 'Acordado individualmente con el médico',
    firstAidDisclaimer:
      'Principios generales de primeros auxilios — las indicaciones médicas individuales siempre tienen prioridad.',
    emergencyMeds: 'Medicación de emergencia',
    emergencyMedsNote: 'Administrar solo según lo acordado con la familia o conforme al plan establecido.',
    allergies: 'Alergias e intolerancias',
    everyday: 'En el día a día',
    helps: 'Esto ayuda',
    avoid: 'Evitad, por favor',
    triggersTitle: 'Circunstancias documentadas con frecuencia',
    triggersNote: 'Observaciones de la familia — no son prueba de un desencadenante.',
    frequencyTitle: 'Situación actual en breve',
    freqNone: 'Últimas 4 semanas: ningún episodio documentado',
    freqSome: 'Últimas 4 semanas: {n} episodios documentados',
    freqFreeDays: 'actualmente {n} días sin episodios',
    contact: 'Contacto para preguntas',
    footer:
      'Creado con care-diary — los datos permanecen en el dispositivo de la familia. Tratadlo con confidencialidad y no lo difundáis.',
    livesWith: '{name} vive con: {condition}.',
    cardTitle: 'INFORMACIÓN DE EMERGENCIA',
    cardMed: 'Medicación de emergencia',
    cardContact: 'Contacto',
  },
};

export function fill(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.split(`{${k}}`).join(String(v)),
    template
  );
}

/** Übersetzte Preset-Inhalte (Ereignisarten + Erste-Hilfe); de = Preset selbst */
export interface PresetTranslation {
  conditionLabel: string;
  eventTypes: Record<string, { label: string; description: string }>;
  firstAid: string[];
}

const EN_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'Epilepsy / seizure disorder',
    eventTypes: {
      focal_aware: {
        label: 'Focal, aware',
        description: 'Fully conscious; e.g. twitching, tingling or a strange feeling in one part of the body.',
      },
      focal_impaired: {
        label: 'Focal, impaired awareness',
        description: 'Absent/unresponsive, often automatisms (fumbling, lip-smacking), confused afterwards.',
      },
      tonic_clonic: {
        label: 'Tonic-clonic (“grand mal”)',
        description: 'Body stiffens, then rhythmic jerking; loss of consciousness.',
      },
      absence: {
        label: 'Absence',
        description: 'Brief absence (seconds), blank stare, interrupts activity, immediately back afterwards.',
      },
      myoclonic: {
        label: 'Myoclonic',
        description: 'Single, lightning-like muscle jerks (e.g. arms), usually while conscious.',
      },
      atonic: {
        label: 'Atonic (drop attack)',
        description: 'Sudden loss of muscle tone, slumping or falling.',
      },
      unclassified: {
        label: 'Unclear / not classifiable',
        description: 'A striking episode that fits no description — document it anyway!',
      },
    },
    firstAid: [
      'Stay calm — most seizures stop on their own.',
      'Check the time and note the duration.',
      'Move dangerous objects away, cushion the head (e.g. with a jacket).',
      'Do not restrain the person and put nothing in their mouth.',
      'After the seizure, place them in the recovery position and stay until they are fully back.',
      'Call emergency services (112): if the seizure lasts longer than 5 minutes, another follows immediately, an injury occurred, or it is the first seizure ever.',
      'Afterwards, briefly inform the parents/family — time and duration help a lot.',
    ],
  },
  migraine: {
    conditionLabel: 'Migraine / headache',
    eventTypes: {
      migraine_aura: {
        label: 'Migraine with aura',
        description: 'Warning signs like flickering, flashes of light, tingling or speech difficulty, then headache.',
      },
      migraine_no_aura: {
        label: 'Migraine without aura',
        description: 'Usually one-sided throbbing headache, often with nausea and sensitivity to light/noise.',
      },
      tension: {
        label: 'Tension headache',
        description: 'Dull, pressing, both sides (“like a band around the head”), usually without nausea.',
      },
      cluster: {
        label: 'Cluster-like',
        description: 'Very severe one-sided pain around eye/temple, often with a watering eye.',
      },
      unclassified: {
        label: 'Unclear / not classifiable',
        description: 'A striking headache episode that fits no description — document it anyway!',
      },
    },
    firstAid: [
      'Make a quiet, darkened place possible — light and noise often make it worse.',
      'Offer water; if agreed, the medication according to plan.',
      'Do not push (“pull yourself together” does not help — it is not a question of will).',
      'Give time: withdrawing is not rudeness but self-protection.',
      'Inform the family about unusually severe or completely new symptoms.',
    ],
  },
  generic: {
    conditionLabel: 'Chronic condition',
    eventTypes: {
      episode: { label: 'Episode / flare', description: 'Acute worsening or attack.' },
      anomaly: {
        label: 'Anomaly',
        description: 'Something was different than usual — observe and document.',
      },
    },
    firstAid: [
      'Stay calm and stay with the person.',
      'Do not force anything — time and a quiet place usually help most.',
      'If unsure, or if symptoms are unusually severe, inform the family.',
    ],
  },
};

const FR_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'Épilepsie / trouble convulsif',
    eventTypes: {
      focal_aware: {
        label: 'Focale, consciente',
        description: 'Pleinement conscient ; p. ex. secousses, fourmillements ou sensation étrange dans une partie du corps.',
      },
      focal_impaired: {
        label: 'Focale, conscience altérée',
        description: 'Absent/ne répond pas, souvent des automatismes (tripotage, mâchonnements), confus ensuite.',
      },
      tonic_clonic: {
        label: 'Tonico-clonique (« grand mal »)',
        description: 'Raidissement du corps, puis secousses rythmiques ; perte de connaissance.',
      },
      absence: {
        label: 'Absence',
        description: 'Brève absence (quelques secondes), regard fixe, interrompt l’activité, revient aussitôt.',
      },
      myoclonic: {
        label: 'Myoclonique',
        description: 'Secousses musculaires isolées, très brèves (p. ex. les bras), généralement conscient.',
      },
      atonic: {
        label: 'Atonique (chute)',
        description: 'Perte soudaine du tonus musculaire, affaissement ou chute.',
      },
      unclassified: {
        label: 'Incertain / non classable',
        description: 'Un épisode marquant qui ne correspond à aucune description — à documenter quand même !',
      },
    },
    firstAid: [
      'Garder son calme — la plupart des crises s’arrêtent d’elles-mêmes.',
      'Regarder l’heure et retenir la durée.',
      'Écarter les objets dangereux, protéger la tête (p. ex. avec une veste).',
      'Ne pas immobiliser la personne et ne rien mettre dans sa bouche.',
      'Après la crise, la mettre en position latérale de sécurité et rester jusqu’à son retour complet.',
      'Appeler les secours (112) : si la crise dure plus de 5 minutes, si une autre suit aussitôt, en cas de blessure ou s’il s’agit de la toute première crise.',
      'Ensuite, prévenir brièvement les parents/la famille — l’heure et la durée aident beaucoup.',
    ],
  },
  migraine: {
    conditionLabel: 'Migraine / céphalées',
    eventTypes: {
      migraine_aura: {
        label: 'Migraine avec aura',
        description: 'Signes annonciateurs comme scintillements, éclairs, fourmillements ou trouble de la parole, puis céphalée.',
      },
      migraine_no_aura: {
        label: 'Migraine sans aura',
        description: 'Céphalée pulsatile souvent unilatérale, souvent avec nausées et sensibilité à la lumière/au bruit.',
      },
      tension: {
        label: 'Céphalée de tension',
        description: 'Sourde, en pression, des deux côtés (« comme un bandeau »), généralement sans nausées.',
      },
      cluster: {
        label: 'Type algie vasculaire',
        description: 'Douleur très intense d’un seul côté autour de l’œil/la tempe, souvent avec œil larmoyant.',
      },
      unclassified: {
        label: 'Incertain / non classable',
        description: 'Un épisode marquant qui ne correspond à aucune description — à documenter quand même !',
      },
    },
    firstAid: [
      'Permettre un endroit calme et sombre — la lumière et le bruit aggravent souvent.',
      'Proposer de l’eau ; si convenu, le médicament selon le plan.',
      'Ne pas insister (« ressaisis-toi » n’aide pas — ce n’est pas une question de volonté).',
      'Laisser du temps : se retirer n’est pas de l’impolitesse mais une protection.',
      'Prévenir la famille en cas de symptômes inhabituellement forts ou nouveaux.',
    ],
  },
  generic: {
    conditionLabel: 'Maladie chronique',
    eventTypes: {
      episode: { label: 'Épisode / poussée', description: 'Aggravation aiguë ou crise.' },
      anomaly: {
        label: 'Anomalie',
        description: 'Quelque chose était différent — observer et documenter.',
      },
    },
    firstAid: [
      'Garder son calme et rester auprès de la personne.',
      'Ne rien forcer — du temps et un endroit calme aident le plus souvent.',
      'En cas de doute ou de symptômes inhabituellement forts, prévenir la famille.',
    ],
  },
};

const TR_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'Epilepsi / nöbet hastalığı',
    eventTypes: {
      focal_aware: {
        label: 'Fokal, bilinçli',
        description: 'Bilinç tamamen açık; örn. vücudun bir bölümünde seğirme, karıncalanma veya tuhaf bir his.',
      },
      focal_impaired: {
        label: 'Fokal, bilinç etkilenmiş',
        description: 'Dalgın/tepkisiz, sıkça otomatik hareketler (elleme, ağız şapırdatma), sonrasında sersemlik.',
      },
      tonic_clonic: {
        label: 'Tonik-klonik („büyük nöbet")',
        description: 'Vücut kasılır, ardından ritmik sıçramalar; bilinç kaybı.',
      },
      absence: {
        label: 'Absans',
        description: 'Saniyeler süren kısa dalma, boş bakış, etkinliği böler, hemen ardından geri döner.',
      },
      myoclonic: {
        label: 'Miyoklonik',
        description: 'Tek tek, şimşek gibi kas sıçramaları (örn. kollar), genellikle bilinç açık.',
      },
      atonic: {
        label: 'Atonik (düşme nöbeti)',
        description: 'Kas geriliminin aniden kaybı, çökme veya düşme.',
      },
      unclassified: {
        label: 'Belirsiz / sınıflandırılamıyor',
        description: 'Hiçbir tanıma uymayan dikkat çekici bir olay — yine de kaydedin!',
      },
    },
    firstAid: [
      'Sakin kalın — nöbetlerin çoğu kendiliğinden durur.',
      'Saate bakın ve süreyi aklınızda tutun.',
      'Tehlikeli nesneleri uzaklaştırın, başını yumuşak bir şeyle destekleyin (örn. ceket).',
      'Kişiyi tutmayın ve ağzına hiçbir şey koymayın.',
      'Nöbetten sonra yan yatırın (derlenme pozisyonu) ve tamamen kendine gelene kadar yanında kalın.',
      '112’yi arayın: nöbet 5 dakikadan uzun sürerse, hemen bir yenisi başlarsa, yaralanma olduysa veya bu ilk nöbetse.',
      'Sonrasında aileye kısaca haber verin — saat ve süre çok yardımcı olur.',
    ],
  },
  migraine: {
    conditionLabel: 'Migren / baş ağrısı',
    eventTypes: {
      migraine_aura: {
        label: 'Auralı migren',
        description: 'Işık çakmaları, titreme, karıncalanma veya konuşma bozukluğu gibi öncüller, ardından baş ağrısı.',
      },
      migraine_no_aura: {
        label: 'Aurasız migren',
        description: 'Genellikle tek taraflı zonklayan baş ağrısı, sıkça bulantı ve ışık/gürültü hassasiyeti ile.',
      },
      tension: {
        label: 'Gerilim tipi baş ağrısı',
        description: 'Künt, baskı yapan, iki taraflı („başın etrafında bant gibi"), genellikle bulantısız.',
      },
      cluster: {
        label: 'Küme tipi',
        description: 'Göz/şakak çevresinde çok şiddetli tek taraflı ağrı, sıkça gözde yaşarma ile.',
      },
      unclassified: {
        label: 'Belirsiz / sınıflandırılamıyor',
        description: 'Hiçbir tanıma uymayan dikkat çekici bir atak — yine de kaydedin!',
      },
    },
    firstAid: [
      'Sessiz, karartılmış bir yer sağlayın — ışık ve gürültü genellikle kötüleştirir.',
      'Su verin; kararlaştırıldıysa plana göre ilacını verin.',
      'Zorlamayın („kendini topla" yardımcı olmaz — bu bir irade meselesi değildir).',
      'Zaman tanıyın: geri çekilmek kabalık değil, kendini korumadır.',
      'Alışılmadık şiddette veya yeni belirtilerde aileye haber verin.',
    ],
  },
  generic: {
    conditionLabel: 'Kronik hastalık',
    eventTypes: {
      episode: { label: 'Atak / alevlenme', description: 'Ani kötüleşme veya kriz.' },
      anomaly: {
        label: 'Olağan dışılık',
        description: 'Bir şey her zamankinden farklıydı — gözlemleyin ve kaydedin.',
      },
    },
    firstAid: [
      'Sakin kalın ve kişinin yanında kalın.',
      'Hiçbir şeyi zorlamayın — zaman ve sakin bir ortam çoğunlukla en iyisidir.',
      'Emin değilseniz veya belirtiler alışılmadık şiddetteyse aileye haber verin.',
    ],
  },
};

const AR_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'الصرع / اضطراب النوبات',
    eventTypes: {
      focal_aware: {
        label: 'بؤرية مع وعي',
        description: 'بوعي كامل؛ مثل ارتجافات أو وخز أو شعور غريب في جزء من الجسم.',
      },
      focal_impaired: {
        label: 'بؤرية مع اضطراب الوعي',
        description: 'شرود/عدم استجابة، وغالبًا حركات تلقائية (عبث باليدين، مصمصة الشفاه)، ثم تشوّش بعدها.',
      },
      tonic_clonic: {
        label: 'توترية رمعية («النوبة الكبرى»)',
        description: 'تيبّس الجسم ثم اهتزازات إيقاعية؛ فقدان الوعي.',
      },
      absence: {
        label: 'نوبة غياب',
        description: 'غياب قصير (ثوانٍ)، نظرة شاردة، يقطع النشاط، ثم يعود فورًا.',
      },
      myoclonic: {
        label: 'رمعية عضلية',
        description: 'انتفاضات عضلية خاطفة منفردة (مثل الذراعين)، غالبًا مع بقاء الوعي.',
      },
      atonic: {
        label: 'ارتخائية (نوبة سقوط)',
        description: 'فقدان مفاجئ لتوتر العضلات، انهيار أو سقوط.',
      },
      unclassified: {
        label: 'غير واضحة / غير قابلة للتصنيف',
        description: 'حدث لافت لا يطابق أي وصف — وثّقوه رغم ذلك!',
      },
    },
    firstAid: [
      'حافظوا على الهدوء — معظم النوبات تتوقف من تلقاء نفسها.',
      'انظروا إلى الساعة واحفظوا المدة.',
      'أبعدوا الأشياء الخطرة وضعوا شيئًا لينًا تحت الرأس (مثل سترة).',
      'لا تمسكوا الشخص بالقوة ولا تضعوا شيئًا في فمه.',
      'بعد النوبة ضعوه في وضعية الإفاقة الجانبية وابقوا معه حتى يعود تمامًا.',
      'اتصلوا بالإسعاف (112): إذا استمرت النوبة أكثر من 5 دقائق، أو تلتها نوبة أخرى مباشرة، أو حدثت إصابة، أو كانت النوبة الأولى.',
      'بعد ذلك أخبروا الأهل باختصار — الوقت والمدة يساعدان كثيرًا.',
    ],
  },
  migraine: {
    conditionLabel: 'الشقيقة / الصداع',
    eventTypes: {
      migraine_aura: {
        label: 'شقيقة مع أورة',
        description: 'علامات منذرة مثل وميض أو ومضات ضوء أو وخز أو صعوبة كلام، ثم صداع.',
      },
      migraine_no_aura: {
        label: 'شقيقة بدون أورة',
        description: 'صداع نابض غالبًا في جهة واحدة، وكثيرًا ما يصاحبه غثيان وحساسية للضوء/الضجيج.',
      },
      tension: {
        label: 'صداع التوتر',
        description: 'ضاغط، في الجهتين («كطوق حول الرأس»)، غالبًا دون غثيان.',
      },
      cluster: {
        label: 'شبيه بالصداع العنقودي',
        description: 'ألم شديد جدًا في جهة واحدة حول العين/الصدغ، وغالبًا مع دمع العين.',
      },
      unclassified: {
        label: 'غير واضح / غير قابل للتصنيف',
        description: 'نوبة صداع لافتة لا تطابق أي وصف — وثّقوها رغم ذلك!',
      },
    },
    firstAid: [
      'وفّروا مكانًا هادئًا ومعتمًا — الضوء والضجيج يزيدان الحال سوءًا غالبًا.',
      'قدّموا الماء؛ وإذا كان متفقًا عليه، الدواء حسب الخطة.',
      'لا تضغطوا («تمالك نفسك» لا يساعد — فهي ليست مسألة إرادة).',
      'امنحوا وقتًا: الانسحاب ليس قلة أدب بل حماية للنفس.',
      'أخبروا العائلة عند أعراض شديدة غير معتادة أو جديدة كليًا.',
    ],
  },
  generic: {
    conditionLabel: 'مرض مزمن',
    eventTypes: {
      episode: { label: 'نوبة / انتكاسة', description: 'تدهور حاد أو أزمة.' },
      anomaly: {
        label: 'أمر غير معتاد',
        description: 'كان هناك شيء مختلف عن المعتاد — راقبوا ووثّقوا.',
      },
    },
    firstAid: [
      'حافظوا على الهدوء وابقوا مع الشخص.',
      'لا تفرضوا شيئًا — الوقت والمكان الهادئ يساعدان غالبًا.',
      'عند الشك أو أعراض شديدة غير معتادة أخبروا العائلة.',
    ],
  },
};

const UK_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'Епілепсія / судомний розлад',
    eventTypes: {
      focal_aware: {
        label: 'Фокальний, зі свідомістю',
        description: 'При повній свідомості; напр., посмикування, поколювання або дивне відчуття в частині тіла.',
      },
      focal_impaired: {
        label: 'Фокальний, з порушенням свідомості',
        description: 'Відсутній/не реагує, часто автоматизми (перебирання руками, прицмокування), після — сплутаність.',
      },
      tonic_clonic: {
        label: 'Тоніко-клонічний («великий напад»)',
        description: 'Тіло напружується, потім ритмічні посмикування; втрата свідомості.',
      },
      absence: {
        label: 'Абсанс',
        description: 'Коротка відсутність (секунди), застиглий погляд, перериває діяльність, одразу повертається.',
      },
      myoclonic: {
        label: 'Міоклонічний',
        description: 'Поодинокі блискавичні м’язові посмикування (напр., руки), зазвичай при свідомості.',
      },
      atonic: {
        label: 'Атонічний (напад падіння)',
        description: 'Раптова втрата м’язового тонусу, осідання або падіння.',
      },
      unclassified: {
        label: 'Неясно / не класифікується',
        description: 'Помітний епізод, що не підходить під жоден опис — все одно задокументуйте!',
      },
    },
    firstAid: [
      'Зберігайте спокій — більшість нападів минають самі.',
      'Подивіться на годинник і запам’ятайте тривалість.',
      'Приберіть небезпечні предмети, підкладіть під голову щось м’яке (напр., куртку).',
      'Не тримайте людину силою і нічого не кладіть їй до рота.',
      'Після нападу покладіть у стабільне бічне положення і залишайтеся поруч, доки людина повністю не отямиться.',
      'Телефонуйте 112: якщо напад триває довше 5 хвилин, одразу настає наступний, є травма або це перший напад узагалі.',
      'Потім коротко повідомте батьків/родину — час і тривалість дуже допомагають.',
    ],
  },
  migraine: {
    conditionLabel: 'Мігрень / головний біль',
    eventTypes: {
      migraine_aura: {
        label: 'Мігрень з аурою',
        description: 'Провісники, як-от мерехтіння, спалахи світла, поколювання чи порушення мовлення, потім головний біль.',
      },
      migraine_no_aura: {
        label: 'Мігрень без аури',
        description: 'Зазвичай однобічний пульсуючий біль, часто з нудотою та чутливістю до світла/шуму.',
      },
      tension: {
        label: 'Головний біль напруги',
        description: 'Тупий, тиснучий, з обох боків («як обруч навколо голови»), зазвичай без нудоти.',
      },
      cluster: {
        label: 'Кластерного типу',
        description: 'Дуже сильний однобічний біль навколо ока/скроні, часто зі сльозотечею.',
      },
      unclassified: {
        label: 'Неясно / не класифікується',
        description: 'Помітний епізод болю, що не підходить під жоден опис — все одно задокументуйте!',
      },
    },
    firstAid: [
      'Забезпечте тихе, затемнене місце — світло й шум часто погіршують стан.',
      'Запропонуйте воду; якщо домовлено — ліки за планом.',
      'Не тисніть («візьми себе в руки» не допомагає — це не питання волі).',
      'Дайте час: усамітнення — не неввічливість, а самозахист.',
      'Про незвично сильні або зовсім нові симптоми повідомте родину.',
    ],
  },
  generic: {
    conditionLabel: 'Хронічне захворювання',
    eventTypes: {
      episode: { label: 'Епізод / загострення', description: 'Гостре погіршення або криза.' },
      anomaly: {
        label: 'Незвичність',
        description: 'Щось було не так, як зазвичай — спостерігайте й документуйте.',
      },
    },
    firstAid: [
      'Зберігайте спокій і будьте поруч.',
      'Нічого не примушуйте — час і спокійне місце допомагають найбільше.',
      'У разі сумнівів або незвично сильних симптомів повідомте родину.',
    ],
  },
};

const ES_PRESETS: Record<string, PresetTranslation> = {
  epilepsy: {
    conditionLabel: 'Epilepsia / trastorno convulsivo',
    eventTypes: {
      focal_aware: {
        label: 'Focal, consciente',
        description: 'Plenamente consciente; p. ej. sacudidas, hormigueo o una sensación extraña en una parte del cuerpo.',
      },
      focal_impaired: {
        label: 'Focal, con conciencia alterada',
        description: 'Ausente/no responde, a menudo automatismos (manoseo, chupeteo), después confusión.',
      },
      tonic_clonic: {
        label: 'Tónico-clónica («gran mal»)',
        description: 'El cuerpo se rigidiza y luego sacudidas rítmicas; pérdida de conocimiento.',
      },
      absence: {
        label: 'Ausencia',
        description: 'Breve ausencia (segundos), mirada fija, interrumpe la actividad, vuelve de inmediato.',
      },
      myoclonic: {
        label: 'Mioclónica',
        description: 'Sacudidas musculares aisladas y fulminantes (p. ej. brazos), normalmente consciente.',
      },
      atonic: {
        label: 'Atónica (caída súbita)',
        description: 'Pérdida repentina del tono muscular, desplome o caída.',
      },
      unclassified: {
        label: 'Incierto / no clasificable',
        description: 'Un episodio llamativo que no encaja en ninguna descripción — ¡documentadlo igualmente!',
      },
    },
    firstAid: [
      'Mantened la calma — la mayoría de las crisis paran solas.',
      'Mirad el reloj y recordad la duración.',
      'Apartad objetos peligrosos y proteged la cabeza (p. ej. con una chaqueta).',
      'No sujetéis a la persona y no le pongáis nada en la boca.',
      'Después de la crisis, ponedla en posición lateral de seguridad y quedaos hasta que vuelva del todo.',
      'Llamad al 112: si la crisis dura más de 5 minutos, sigue otra inmediatamente, hay una lesión o es la primera crisis.',
      'Después informad brevemente a la familia — la hora y la duración ayudan mucho.',
    ],
  },
  migraine: {
    conditionLabel: 'Migraña / cefalea',
    eventTypes: {
      migraine_aura: {
        label: 'Migraña con aura',
        description: 'Señales previas como centelleos, destellos, hormigueo o dificultad para hablar, luego dolor de cabeza.',
      },
      migraine_no_aura: {
        label: 'Migraña sin aura',
        description: 'Dolor pulsátil normalmente unilateral, a menudo con náuseas y sensibilidad a la luz/el ruido.',
      },
      tension: {
        label: 'Cefalea tensional',
        description: 'Sorda, opresiva, en ambos lados («como una cinta alrededor de la cabeza»), normalmente sin náuseas.',
      },
      cluster: {
        label: 'Tipo racimos',
        description: 'Dolor muy intenso en un lado, alrededor del ojo/la sien, a menudo con lagrimeo.',
      },
      unclassified: {
        label: 'Incierto / no clasificable',
        description: 'Un episodio llamativo que no encaja en ninguna descripción — ¡documentadlo igualmente!',
      },
    },
    firstAid: [
      'Facilitad un lugar tranquilo y oscuro — la luz y el ruido suelen empeorarlo.',
      'Ofreced agua; si está acordado, la medicación según el plan.',
      'No presionéis («contrólate» no ayuda — no es cuestión de voluntad).',
      'Dad tiempo: retirarse no es descortesía, es autoprotección.',
      'Ante síntomas inusualmente fuertes o completamente nuevos, avisad a la familia.',
    ],
  },
  generic: {
    conditionLabel: 'Enfermedad crónica',
    eventTypes: {
      episode: { label: 'Episodio / brote', description: 'Empeoramiento agudo o crisis.' },
      anomaly: {
        label: 'Anomalía',
        description: 'Algo fue distinto de lo habitual — observad y documentad.',
      },
    },
    firstAid: [
      'Mantened la calma y quedaos con la persona.',
      'No forcéis nada — tiempo y un lugar tranquilo suelen ser lo que más ayuda.',
      'En caso de duda o síntomas inusualmente fuertes, avisad a la familia.',
    ],
  },
};

export const PRESET_TRANSLATIONS: Record<
  Exclude<CareReportLanguage, 'de'>,
  Record<string, PresetTranslation>
> = {
  en: EN_PRESETS,
  fr: FR_PRESETS,
  tr: TR_PRESETS,
  ar: AR_PRESETS,
  uk: UK_PRESETS,
  es: ES_PRESETS,
};

/** Preset-Inhalte in Zielsprache (de = Original aus dem Preset) */
export function presetContent(preset: ConditionPreset, lang: CareReportLanguage): PresetTranslation {
  if (lang !== 'de') {
    const t = PRESET_TRANSLATIONS[lang][preset.key];
    if (t) return t;
  }
  return {
    conditionLabel: preset.label,
    eventTypes: Object.fromEntries(
      preset.eventTypes.map((t) => [t.key, { label: t.label, description: t.description }])
    ),
    firstAid: preset.firstAid,
  };
}

/** Kurzanweisungen für die Notfallkarte (max. 4, bewusst knapp) */
export const CARD_STEPS: Record<CareReportLanguage, Record<string, string[]>> = {
  de: {
    epilepsy: [
      'Ruhe bewahren, Dauer merken',
      'Nichts in den Mund, nicht festhalten',
      'Danach stabile Seitenlage',
      '112 bei > 5 Min. oder Verletzung',
    ],
    migraine: ['Ruhe + dunkler Raum', 'Wasser anbieten', 'Nicht drängen'],
    generic: ['Ruhe bewahren, dableiben', 'Nichts erzwingen', 'Im Zweifel Kontakt anrufen'],
  },
  en: {
    epilepsy: [
      'Stay calm, note the duration',
      'Nothing in the mouth, do not restrain',
      'Recovery position afterwards',
      'Call 112 if > 5 min or injured',
    ],
    migraine: ['Quiet + dark room', 'Offer water', 'Do not push'],
    generic: ['Stay calm, stay close', 'Force nothing', 'If unsure, call the contact'],
  },
  fr: {
    epilepsy: [
      'Garder son calme, noter la durée',
      'Rien dans la bouche, ne pas immobiliser',
      'Ensuite position latérale de sécurité',
      '112 si > 5 min ou blessure',
    ],
    migraine: ['Calme + pièce sombre', 'Proposer de l’eau', 'Ne pas insister'],
    generic: ['Garder son calme, rester là', 'Ne rien forcer', 'En cas de doute, appeler le contact'],
  },
  tr: {
    epilepsy: [
      'Sakin kalın, süreyi not edin',
      'Ağza bir şey koymayın, tutmayın',
      'Sonrasında yan yatırın',
      '5 dk’dan uzun / yaralanma: 112',
    ],
    migraine: ['Sessiz + karanlık oda', 'Su verin', 'Zorlamayın'],
    generic: ['Sakin kalın, yanında kalın', 'Zorlamayın', 'Emin değilseniz arayın'],
  },
  ar: {
    epilepsy: [
      'حافظوا على الهدوء ولاحظوا المدة',
      'لا شيء في الفم، لا إمساك بالقوة',
      'بعدها وضعية الإفاقة الجانبية',
      'أكثر من 5 دقائق أو إصابة: 112',
    ],
    migraine: ['هدوء + غرفة معتمة', 'قدّموا الماء', 'لا تضغطوا'],
    generic: ['ابقوا هادئين وقريبين', 'لا تفرضوا شيئًا', 'عند الشك اتصلوا'],
  },
  uk: {
    epilepsy: [
      'Спокій, занотуйте тривалість',
      'Нічого в рот, не тримати силою',
      'Потім стабільне бічне положення',
      'Понад 5 хв або травма: 112',
    ],
    migraine: ['Тиша + темна кімната', 'Запропонуйте воду', 'Не тисніть'],
    generic: ['Спокій, будьте поруч', 'Нічого не примушуйте', 'У сумнівах — телефонуйте'],
  },
  es: {
    epilepsy: [
      'Calma, anotad la duración',
      'Nada en la boca, no sujetar',
      'Después posición lateral',
      '> 5 min o lesión: 112',
    ],
    migraine: ['Calma + habitación oscura', 'Ofreced agua', 'No presionéis'],
    generic: ['Calma, quedaos cerca', 'No forcéis nada', 'Ante dudas, llamad'],
  },
};
