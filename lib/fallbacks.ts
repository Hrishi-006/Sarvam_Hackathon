import type { CustomerAction, Lang, VendorTactic } from './types';

type Line = { line: string; english: string };
type Templates<K extends string> = Record<K, Record<Lang, (amount: number) => Line>>;

export const CUSTOMER_TEMPLATES: Templates<CustomerAction> = {
  ASK_PRICE: {
    'hi-IN': () => ({ line: 'भैया, यह कितने का है?', english: 'Brother, how much is this?' }),
    'mr-IN': () => ({ line: 'दादा, हे कितीला आहे?', english: 'Brother, how much is this?' }),
  },
  COUNTER: {
    'hi-IN': (a) => ({ line: `भैया, ${a} में दे दो ना, रोज़ आती हूँ इधर।`, english: `Brother, give it for ${a}, I come here all the time.` }),
    'mr-IN': (a) => ({ line: `दादा, ${a} ला द्या ना, मी नेहमी येते इथे.`, english: `Brother, give it for ${a}, I always come here.` }),
  },
  THREATEN_WALK: {
    'hi-IN': (a) => ({ line: `रहने दो भैया, आगे दूसरी दुकान देख लेती हूँ। ${a} में देना है तो बोलो।`, english: `Never mind, I'll check another shop. Say so if you'll do ${a}.` }),
    'mr-IN': (a) => ({ line: `राहू द्या दादा, पुढच्या दुकानात बघते. ${a} ला देणार असाल तर सांगा.`, english: `Never mind, I'll check the next shop. Tell me if ${a} works.` }),
  },
  ACCEPT: {
    'hi-IN': (a) => ({ line: `चलो डन, ${a}। पैक कर दो।`, english: `Okay deal, ${a}. Pack it up.` }),
    'mr-IN': (a) => ({ line: `चला, ${a} फायनल. पॅक करा.`, english: `Okay, ${a} final. Pack it.` }),
  },
  DEAL: {
    'hi-IN': (a) => ({ line: `चलो डन, ${a}। पैक कर दो।`, english: `Okay deal, ${a}. Pack it up.` }),
    'mr-IN': (a) => ({ line: `चला, ${a} फायनल. पॅक करा.`, english: `Okay, ${a} final. Pack it.` }),
  },
  WALK_AWAY: {
    'hi-IN': () => ({ line: 'नहीं भैया, रहने दो। थैंक यू।', english: "No thanks, never mind." }),
    'mr-IN': () => ({ line: 'नको दादा, राहू द्या. धन्यवाद.', english: "No thanks, never mind." }),
  },
};

export const VENDOR_TEMPLATES: Templates<VendorTactic> = {
  SPECIAL_RATE: {
    'hi-IN': (a) => ({ line: `आपके लिए स्पेशल रेट, सिर्फ़ ${a}!`, english: `Special rate for you, just ${a}!` }),
    'mr-IN': (a) => ({ line: `तुमच्यासाठी स्पेशल रेट, फक्त ${a}!`, english: `Special rate for you, just ${a}!` }),
  },
  OFFENDED: {
    'hi-IN': (a) => ({ line: `क्या मज़ाक कर रहे हो, इतने में तो कपड़ा भी नहीं आता! ${a} लगेगा।`, english: `Are you joking, that won't even cover the cloth! It'll be ${a}.` }),
    'mr-IN': (a) => ({ line: `काय मस्करी करताय, एवढ्यात कापड पण येत नाही! ${a} लागतील.`, english: `Are you kidding, that's not even cloth cost! It'll be ${a}.` }),
  },
  QUALITY: {
    'hi-IN': (a) => ({ line: `क्वालिटी देखो, मॉल में यही दो हज़ार का है। ${a} दे दो।`, english: `Look at the quality, this is ₹2000 in a mall. Give me ${a}.` }),
    'mr-IN': (a) => ({ line: `क्वालिटी बघा, मॉलमध्ये हेच दोन हजाराला आहे. ${a} द्या.`, english: `Look at the quality, it's ₹2000 in the mall. Give ${a}.` }),
  },
  BOHNI: {
    'hi-IN': (a) => ({ line: `सुबह से बोहनी नहीं हुई, आपके लिए ${a}।`, english: `Haven't made my first sale today, ${a} for you.` }),
    'mr-IN': (a) => ({ line: `सकाळपासून बोहनी झाली नाही, तुमच्यासाठी ${a}.`, english: `No sale since morning, ${a} for you.` }),
  },
  LOSS: {
    'hi-IN': (a) => ({ line: `इतने में तो मेरा लॉस हो जाएगा, ${a} से कम नहीं।`, english: `I'd be at a loss, not less than ${a}.` }),
    'mr-IN': (a) => ({ line: `एवढ्यात माझा लॉस होईल, ${a} पेक्षा कमी नाही.`, english: `I'd lose money, not less than ${a}.` }),
  },
  LAST_PRICE: {
    'hi-IN': (a) => ({ line: `लास्ट प्राइस ${a}, इससे नीचे नहीं जाऊँगा।`, english: `Last price ${a}, won't go lower.` }),
    'mr-IN': (a) => ({ line: `लास्ट प्राइस ${a}, यापेक्षा कमी नाही.`, english: `Last price ${a}, not lower than this.` }),
  },
  CALLBACK: {
    'hi-IN': (a) => ({ line: `अरे रुको रुको! चलो, आपके लिए ${a}।`, english: `Hey wait, wait! Okay, ${a} for you.` }),
    'mr-IN': (a) => ({ line: `अहो थांबा थांबा! चला, तुमच्यासाठी ${a}.`, english: `Hey wait, wait! Okay, ${a} for you.` }),
  },
  CLOSE: {
    'hi-IN': (a) => ({ line: `ले जाओ, ${a} में पैक कर देता हूँ। फिर आना!`, english: `Here, I'll pack it for ${a}. Come again!` }),
    'mr-IN': (a) => ({ line: `घेऊन जा, ${a} मध्ये पॅक करून देतो. परत या!`, english: `Take it, I'll pack it for ${a}. Come again!` }),
  },
  GOODBYE: {
    'hi-IN': () => ({ line: 'जाओ जाओ, ऐसा माल कहीं नहीं मिलेगा!', english: "Go on then, you won't find stuff like this anywhere!" }),
    'mr-IN': () => ({ line: 'जा जा, असा माल कुठे मिळणार नाही!', english: "Go on, you won't find such goods anywhere!" }),
  },
};

export function customerFallback(action: CustomerAction, amount: number | null, lang: Lang): Line {
  return CUSTOMER_TEMPLATES[action][lang](amount ?? 0);
}

export function vendorFallback(tactic: VendorTactic, amount: number, lang: Lang): Line {
  return VENDOR_TEMPLATES[tactic][lang](amount);
}
