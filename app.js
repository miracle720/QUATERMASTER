const SENIOR_PAY=9000,PROBATION_PAY=6500,PROBATION_DAYS=30;
const NAIROBI_FLAT_PAY=1200;
const BANK_DETAILS_START_DATE='2099-01-01';
const CONFIG_KEY='wh_firebase_config_v1';
const SETTINGS_KEY='wh_settings_v2';
const MY_WORKER_NAME_KEY='wh_my_worker_name_v1';
const NOTIF_ENABLED_KEY='wh_notif_enabled_v1';

let db=null;
let workers=[];
let checkins=[];
let admins=[];
let orders=[];
let customerDirectory={}; // Firebase-synced overrides, keyed by lowercased customer name: {name, market, address, updatedAt, updatedBy} — takes precedence over CUSTOMER_SEED_BY_KEY below
let orderCustomerSuggestionsList=[]; // current suggestion list shown under #order-customer-suggestions, indexed for click handlers

// ---- CUSTOMER DIRECTORY (name -> address/market lookup for the order form) ----
// CUSTOMER_DIRECTORY_SEED is a one-time import from the LAGOS_DC customer
// master CSV (Sep 2026): every known customer name/address, with a market
// (state) guessed from the address text where possible — left blank ("s":"")
// where no state could be confidently determined from the address alone.
// This is a READ-ONLY baseline. Any admin correction or new customer typed
// on the order form is saved to Firebase (customerDirectory/, synced into
// the `customerDirectory` object above) and always wins over this seed, so
// the directory only gets more accurate over time and never needs
// re-importing.
const CUSTOMER_DIRECTORY_SEED=[{"n":"Wandana Pharmaceuticals ltd","a":"Calvary Road by Transformer, off Aso road. Mararaba Karu","s":"Nasarawa"},{"n":"OCTAVIA PHARMACY","a":"No 33 Okuta Road Bariga","s":"Lagos"},{"n":"Mosh Pharmacy and Supermarket","a":"10, Aare Avenue, New Bodija, Ibadan, Oyo State.","s":"Oyo"},{"n":"Reechest Pharmacy","a":"Imo","s":"Imo"},{"n":"Bethoy Pharmaceuticals Ltd","a":"12, Arefanla Road Akute Ogun State","s":"Ogun"},{"n":"Farida pms","a":"No 1 naira road rigasa","s":"Kaduna"},{"n":"Ibrahim pms","a":"SHOP NO.2 OPPOSITE KURU ENERGY INTERNATIONAL LTD FILLING STATION, ABUBAKAR KUTA STREET,KWANAN BUSHARA BY MAKARFI ROAD,RIGASA KADUNA","s":"Kaduna"},{"n":"Anvilles Pharmacy","a":"62 Abeke Road By Owumi Road Junction,Abeke Road,Sapele,Delta State","s":"Delta"},{"n":"I care pharmacy and Store Gombe","a":"Federal lowcust gombe","s":"Gombe"},{"n":"Pillsfield pharmacy","a":"176, Ikorodu road, Elediye bus stop","s":"Lagos"},{"n":"Kotz Pethabam Pharma","a":"Old 123 New 19 Adiyan Orudu road Adiyan gasline bus stop Agbado Ogun state","s":"Ogun"},{"n":"Federal medical Centre Gusau","a":"Gusau Zamfara state","s":"Zamfara"},{"n":"MEGALIFE PHARMACY","a":"24B Ogoro Bar Junction by Okpe Road","s":""},{"n":"Brace Pharmacy and Store","a":"1, Frank Apokwu Street D,B,S Road","s":""},{"n":"JAJA CLINIC, UNIVERSITY OF IBADAN","a":"University Of Ibadan","s":"Oyo"},{"n":"SAFEMED PHARMACY & STORES","a":"Suite A5 Poly Plaza Ademola Adetokunbo Crescent Wuse 2","s":"FCT"},{"n":"Maman boy medicine store","a":"No3 jibga road tudun wada zaria PACS","s":"Kaduna"},{"n":"Hallmark Medics Pharmacy","a":"40 Uruan Street, Uyo","s":"Akwa Ibom"},{"n":"Pharmpro Pharmacy Limited & Stores","a":"162 Ipaja Road, Agbotikuyo, Agege, Lagos","s":"Lagos"},{"n":"Abek Pharmacy","a":"143, Ipaja Road Agbotikuyo, Agege Ipaja Lagos","s":"Lagos"},{"n":"HMR PHARMACY","a":"32 Lanre Awolokun Street Gbagada Phase2","s":"Lagos"},{"n":"New Age Pharmaceuticals","a":"6, Alaja Ajayi, Sabo Ojodu Berger Ogun state","s":"Ogun"},{"n":"Drugs N More Pharmacy","a":"A1-6 Eleos plaza off orchid road eleganza","s":"Lagos"},{"n":"SHAMSU ALIYU","a":"UNGUWAN MABUSA GIWA","s":"Kaduna"},{"n":"Quick Buy Supermarket Pharmacy","a":"Bompai, 505 Hadejia Road, Bompai GRA KANO","s":"Kano"},{"n":"S kwalli Pms","a":"Yar kasuwa Sheka","s":"Kano"},{"n":"Seraph Pharmacy Limited","a":"81, Wetheral road Owerri, Imo State.","s":"Imo"},{"n":"Chicare pharmacy","a":"254 Murtala Muhammed Highway","s":""},{"n":"A A Nelson Pharmacy and store limited","a":"Shop 5 hestp plaza Lamingo Road Jos","s":"Plateau"},{"n":"Triple F Pharmacy And Store Ltd","a":"Plot 28 Alfonso Road, Olodi- Sasa Road, Ojoo","s":"Oyo"},{"n":"AMAL PMS","a":"18 Lokoja road Rigasa kaduna","s":"Kaduna"},{"n":"Hafsat PMS","a":"N0.2 Magaji Road Badiko","s":"Kaduna"},{"n":"Iduna Specialist Hospital","a":"1A Takoradi Road, Apapa GRA","s":"Lagos"},{"n":"Medix Patent Store","a":"25 Mabawonku Street oworoshoki","s":"Lagos"},{"n":"Springview Pharmacy","a":"127 Awori street, Ilepo alhaji Bus stop, Egbeda-Idimu Road","s":"Lagos"},{"n":"Sampraise PMS","a":"No 1 habib Agric ojo Lagos","s":"Lagos"},{"n":"Koryol and Unanyi pharmacy & store ltd","a":"Gimare junction along federal university of lafia , nasarawa state","s":"Nasarawa"},{"n":"INVIGORATE PHARMACY","a":"Gaida panshekara Road","s":""},{"n":"Willzilt Pharmacy","a":"26, Denro Ishashi road off Ojodu-Abiodun street, Ojodu-Berger","s":"Lagos"},{"n":"MACILAND MEDICAL centre","a":"51 lafunke street papa bus stop ijegun ikotun","s":"Lagos"},{"n":"OMWELL PHARMACY","a":"Opposite Ruby Events centre, Elenusonso road, Ologuneru.","s":"Oyo"},{"n":"Medsolution Pharmacy","a":"Suite 34/25 Elshaddai Shopping mall, Cele B/Stop, Egbe.","s":"Lagos"},{"n":"Fondoz and Kings Pharmacy, Orozo","a":"Agwan Sarkin Street, Arab Junction, Orozo, Abuja","s":"FCT"},{"n":"Asokoro General Hospital","a":"Julius Nyerere Cres, Asokoro, Aso 900103, Federal Capital Territory, Nigeria","s":"FCT"},{"n":"Ismail pms","a":"No 26b kalaye road hayin banki","s":"Kaduna"},{"n":"Ollan B Pharmacy Ltd","a":"No 3 Akwanga close by ille ife street off emeka anyaku garki area 8","s":"FCT"},{"n":"Albarka medical Zaria","a":"Sabon gari Zaria","s":"Kaduna"},{"n":"A A Rasam Pharmaceuticals ltd","a":"No 24 wharf Road PZ Zaria","s":"Kaduna"},{"n":"Miracare pharmacy limited","a":"32 Okhuoromi road Irhirhi-okhuoromi road off Airport road, Benin-city","s":"Edo"},{"n":"Comiid pharmacy","a":"285 Nwaniba road","s":"Akwa Ibom"},{"n":"YIHHAMAZ PMS","a":"RAQ 17 SCHOOL ROAD RAFIN GUZA","s":"Kaduna"},{"n":"Ugwoke Ikenna","a":"29 Kayode Street OKUOKOK","s":""},{"n":"M-Saleh pharmacy","a":"HGQX+MXR, Shiroro Road, Tudun Wada South, Minna 920101, Niger","s":"Niger"},{"n":"Citizen Belt pharmacy","a":"Beside NUJ , naka road ,Makurdi,Lafia","s":""},{"n":"Hikima healthways nursing care and diagnosis","a":"Kwanar ganduje, opposite gidan mariya","s":""},{"n":"Life-Care Pharmacy","a":"96, 1st east circular road","s":""},{"n":"Menniscus Specialist hospital","a":"No. 59 old Azikoro road, okaka, yenagoa","s":"Bayelsa"},{"n":"Ejike PMS","a":"7 Owonikoko Street Ayobo","s":"Lagos"},{"n":"Accupil Pharmacy","a":"11 Abdullahi Street Opposite Ayetoro Primary School Chemist Bus stop Akoka Lagos","s":"Lagos"},{"n":"SSANU Fittamas Pharmacy and store","a":"UNEC campus beside open sharaton restaurant, Enugu","s":"Enugu"},{"n":"Salma pms","a":"No 30 Naira road,by Zaria road,Rigasa,Kaduna.","s":"Kaduna"},{"n":"Zemax pharmacy & Stores Ltd","a":"No1 wole Omoosho, off 5th Avenue , gowon estate, Egbeda","s":"Lagos"},{"n":"Power Pharmacy Limited","a":"Liman Abaji Keffi, Nasarawa State.","s":"Nasarawa"},{"n":"Yuguda shidi pharmacy","a":"Gomboru ward","s":""},{"n":"Kamel Pharmacy","a":"90B Goldie Street, Calabar.","s":"Cross River"},{"n":"Bukarta pharmacy makurdi","a":"No 14, balewa cresent , makurdi","s":"Benue"},{"n":"GOLDEN ERA PHARMACY","a":"3/5 Babafemi Dada Road, Idowu Egba Bus stop, Igando lagos","s":"Lagos"},{"n":"An Nur Medicine Store","a":"Makera kadage,kauru kaduna","s":"Kaduna"},{"n":"Auntymama patient medicine store","a":"Kagoro road by layin Zuma sabon garin tudun wada","s":""},{"n":"Crestline Pharmacy","a":"No 5 Okigwe road Amajk, Owerri","s":"Imo"},{"n":"Remson pharmacy","a":"2, akintunde Street, ijaiye ojokoro lagos","s":"Lagos"},{"n":"Shozek pharmacy and store","a":"Federal lowcust adjacent sabana hospital","s":""},{"n":"Faith Mediplex Teaching Hospital","a":"1 Giwa Amu, Airport road, Benin city, Edo state","s":"Edo"},{"n":"Titoba pharmacy gambari","a":"G157 Isale gambari","s":""},{"n":"Dandalama patent medicine store","a":"Bachirawa, kwanar Ungoggo.","s":""},{"n":"EMTOB PHARMACY LTD","a":"Isioma plaza. Transformer at nwawolor","s":""},{"n":"Peaceway Pharmacy","a":"34, Igando road Ikotun Lagos","s":"Lagos"},{"n":"Care Mark Specialist","a":"348b , Along Benin Auchi Express Rd opposite federal housing estate, Ogheghe, B/c","s":"Edo"},{"n":"JOEHI","a":"No 6 Alhaji Adikatu oluwo street, besides ( Grandma food canteen) mosan.","s":"Lagos"},{"n":"Veramary Pharmacy - Lekki","a":"Shop 9&10 Milagro mall Orchid Road, Lekki","s":"Lagos"},{"n":"LSMOH-LMS Oshodi","a":"1, Nitel road, Oshodi","s":"Lagos"},{"n":"Chibuik medical's store","a":"Nsukka","s":"Enugu"},{"n":"Mednuel Pharmacy Enugu","a":"No 1 Osina street Federal housing Enugu","s":"Enugu"},{"n":"Asmau patient medicine store","a":"NO 19 nagoyi zaria kaduna","s":"Kaduna"},{"n":"ADESTAR DAILYNEED SERVICES","a":"62 Sobi road via Gambari","s":"Kwara"},{"n":"Nmerisom pharmacy and stores","a":"No 14 orifite street ogui newlayout Enugu","s":"Enugu"},{"n":"Xeekeay pharmacy","a":"No 189 naibawa","s":"Kano"},{"n":"Ola-oluwa ibeshe","a":"3 Chief Olusola Oshibanjo Avenue Ibeshe","s":"Lagos"},{"n":"Incentive pharmacy","a":"Joe akaa-han road Beside NYSC sectariat makurdi","s":"Benue"},{"n":"AmatuLLah Chemist","a":"Layin Kabir mai itace tudun murtala , before gidan bogobiri","s":""},{"n":"Tychicus Pharma and Mart","a":"Opo. OLD Oba's Palace, Ilẹkun Oda Road","s":""},{"n":"Jushaat pms","a":"A1 samaru airforce road kakuri","s":"Kaduna"},{"n":"All Day Pharmacy & Stores","a":"12 sadiku street ilasamaja mushin lagos","s":"Lagos"},{"n":"MebLink Bioscience Ltd","a":"Sharp conner mararaba nassarawa state","s":"Nasarawa"},{"n":"Barwa Hospital kaffin-koro Niger","a":"No;13 along gwada road kaffin-koro paikoro LGA,Niger state","s":"Niger"},{"n":"Molly Ventures","a":"Olisa Street Close to General hospital, ijebu ode","s":"Ogun"},{"n":"BBG medicine stone giwa","a":"No 5 bakin kasuwa giwa","s":"Kaduna"},{"n":"Devacare pharmacy","a":"143B Adaloko Church bus stop, off Badagry exp way.","s":"Lagos"},{"n":"Fatima","a":"Kurna gidan gona","s":""},{"n":"TOTAL PHARMACARE RX","a":"Directly opposite General Hospital Gbagada","s":"Lagos"},{"n":"Aisha Garba","a":"Rr 16 Shandam street Askolaye","s":""},{"n":"Pathfinder procurement Abuja","a":"Pathfinder procurement Abuja","s":"FCT"},{"n":"ALAYO pms","a":"10 Tunji Akin-ojo street","s":"Lagos"},{"n":"Imperial Care Pharmacy","a":"17 Ekpenyong Street, Uyo","s":"Akwa Ibom"},{"n":"Enivic PMS","a":"12, Association Avenue, Ishefun Ayobo","s":"Lagos"},{"n":"Maman Hafsat pms","a":"Hajia street unguwan kanawa,sabon gari","s":""},{"n":"Rabiatu Yusuf","a":"No7Ang tanki jushi zaria","s":"Kaduna"},{"n":"Az-Zahra PMS","a":"23 Yantikwane Zango Road Tudun Wada Kaduna","s":"Kaduna"},{"n":"Ekiti State Drugs And Health Supply Management Agency","a":"EKSUTH Premises, Adebayo Road, Ado Ekiti, Ekiti State","s":"Ekiti"},{"n":"Hope store","a":"No 32 back of white house abijo","s":"Lagos"},{"n":"Gold standard meds/supermarket","a":"6 okegun school ibeju lekki","s":"Lagos"},{"n":"Good health patient medicine shop","a":"No 1 talemu street igando oloja","s":"Lagos"},{"n":"Beaconcare pharmacy and stores LTD","a":"Eke Alulu junction. Opposite Alulu nike town hall","s":""},{"n":"Denzel Medical Store","a":"DENZEL MEDICAL STORE by OUR MOTHER MARY CATHOLIC CHURCH abijo GRA ibeju lekki Lagos.","s":"Lagos"},{"n":"LEEKLARD-MEDIX PHARMACY","a":"Plot 49, 254 Road, beside 21 flats, Abulado Lagos state","s":"Lagos"},{"n":"Demmy-Dammy Pharmacy","a":"FUTA SOUTH GATE","s":"Ondo"},{"n":"Afolayan Justina","a":"1 CAC street Abule odu Lagos","s":"Lagos"},{"n":"Mekon Pharmacy","a":"22 Idimu road Ikotun","s":"Lagos"},{"n":"Al Ihsan H","a":"No1 chori road kawo kaduna","s":"Kaduna"},{"n":"Kabara pharmacy and store Jos","a":"42/4 masalacin jumia street","s":"Plateau"},{"n":"PVX Drugs Ltd","a":"House 2, First Avenue, FHA, Lugbe","s":"FCT"},{"n":"ONDO STATE DMA","a":"Opposite Honeymoon Junction, Beside AA Rano Petrol Station, Ondo Road, Akure, Ondo State.","s":"Ondo"},{"n":"God grace patent Medicine Store","a":"No16, Fajumobi Street, Ponle Street, Egbeda","s":"Lagos"},{"n":"Ayokeji shop","a":"No 1 Lukumon Talibi abijon","s":""},{"n":"Fagbenro Adebukola Rodiat","a":"Fra-salaudeen pharmacy, 1 ikot Ekan street, ipakodo Ikorodu. Lagos state","s":"Lagos"},{"n":"HEALTH SPRING OWEH","a":"23 Oweh Street Ajib Fadeyi","s":"Lagos"},{"n":"His Grace PPMV","a":"2,, Akogun close Ibeshe-Titun.","s":"Lagos"},{"n":"Agatha ppmv","a":"Alatunse bus stop white sand","s":""},{"n":"Medicine point pharmacy and stores","a":"14 Marshall Amadi Street, off Airport Road by Chicken Republic, White House, Rukpokwu, Port-harcourt.","s":"Rivers"},{"n":"Maubright Pharmacy Limited","a":"Koise Mini Plaza, Old KAru Road, Mararaba, Nasarawa State","s":"Nasarawa"},{"n":"Maxgenix","a":"Josephine plaza. Behind Asaba Specialist Hospital","s":"Delta"},{"n":"Mado Pharmacy","a":"72 Dedevwo Road Gana Sapele","s":"Delta"},{"n":"Ekeoma PMS","a":"46 Yusuf Street Ejigbo","s":"Lagos"},{"n":"Ceres Pharmacy","a":"184, Adetola street, Aguda Surulere","s":"Lagos"},{"n":"Visa pharmacy","a":"Medical plaza, opposite bergar camp mpape","s":"FCT"},{"n":"NOELLA Medicare and stores","a":"Palm crescent, anu crescent, Badore, ajah","s":"Lagos"},{"n":"MEDIGREAT PHARMACY","a":"Adjacent Ejiko Close, Old Eku/Sapele Road, Abraka Delta State","s":"Delta"},{"n":"OPEYEMI PPMV","a":"22. Jemi Alade Estate Lasu Isheri Road power line bus stop.","s":"Lagos"},{"n":"Morning Dew Hospital","a":"Plot FV 79 Industrial cluster Naze Owerri North,Imo State.","s":"Imo"},{"n":"US Pharmacy","a":"BS 3057 Dan Gwauro","s":""},{"n":"Doxacare Pharmacy","a":"15 Omovie Street off community Road, Ago","s":""},{"n":"Ayo Ade pms","a":"11, Adedeji akosile close, off unity road, koloba, ayobo, Lagos.","s":"Lagos"},{"n":"AOU PMS","a":"16 Peace Avenue Olubondu Ipaja","s":"Lagos"},{"n":"Arise and shine pms","a":"No8 Adaboyejo street Eputu ibeju lekki","s":"Lagos"},{"n":"Keyhealth pharmacy and stores ltd","a":"94 Jattu road, Auchi. Edo State","s":"Edo"},{"n":"Med-Del Pharmacy and Mini-Mart","a":"413 Nwaniba Road","s":"Akwa Ibom"},{"n":"NKA_BROOKSLAND AND CHEMIST & STORES","a":"C26 Sani Mohd Market Road Ungwar Sunday","s":""},{"n":"Family pms","a":"Afaka, Kaduna","s":"Kaduna"},{"n":"Azeema medicine store","a":"Gobirawa, burhana","s":"Kano"},{"n":"IB GIDADO MEDICINE STORE","a":"Medile opposite khalid blocks near shagari quarters, kano","s":"Kano"},{"n":"Bintek Pharmacy and Clinic Katsina","a":"No 111 Yahaya madaki way K/Kaura Katsina, Katsina State.","s":"Katsina"},{"n":"Tabson Pharmacy","a":"No 41, Rwang Pam street, Jos","s":"Plateau"},{"n":"PATRIARCH PHARMACY","a":"72,OKERE ROAD,NEAR NIGERIA PRISON","s":""},{"n":"Homely Health Care Pharmacy","a":"Homely Healthcare Pharmacy, Temidire Street, Off Ifaki Toad, Ekiti","s":"Ekiti"},{"n":"BUSHRA PMS","a":"PJ 6 Igabi/Zango Road After Asibitin Yara","s":""},{"n":"Blessed chy cardinal pharm","a":"No A26 along shishimpe road Mpape Abuja","s":"FCT"},{"n":"Nana Asma'u pms","a":"HayiMalam Bello","s":""},{"n":"Smile Spring Pharmacy Ltd","a":"smilespring pharmacy ltd , suncity hotel owerri","s":"Imo"},{"n":"Shapure medical store","a":"No 2 market road Nung oku ibeskipo uyo","s":"Akwa Ibom"},{"n":"UNIVERSITY OF ILORIN TEACHING HOSPITAL","a":"Kwara","s":"Kwara"},{"n":"Able God Patent Medicine Store","a":"No 3 Alhaja brown street olude ipaja","s":"Lagos"},{"n":"Dazet Pharmacaceutical","a":"Baruwa bustop Ipaja road. Lagos state","s":"Lagos"},{"n":"University of calabar teaching hospital","a":"","s":"Cross River"},{"n":"GreeenCare Pharmacy","a":"60/61 community road new site satellite town Lagos close to Alakija","s":"Lagos"},{"n":"Rasco-dee","a":"No 1 Uche Road, sabon Gari Zaria","s":"Kaduna"},{"n":"Real are pharmacy","a":"38, sakponba road, Benin city Edo state","s":"Edo"},{"n":"Egbeda Pharmacy","a":"14 Idimu road, Egbeda Lagos","s":"Lagos"},{"n":"Relarex Ikorodu","a":"60, Lagos road, Okay Bus stop, Agric, Ikorodu","s":"Lagos"},{"n":"OLABISI ONABANJO UNIVERSITY TEACHING HOSPITAL","a":"Hospital Road, Sagamu, Ogun State","s":"Ogun"},{"n":"Emphatic Medicare","a":"266 Maikalwa Gabas, Layin Road Safety, Naibawa, Kano State","s":"Kano"},{"n":"Sybarmedics Nigeria LTD","a":"1 Agbede Olorogbo Bustop, Bia Asolo Bustop Off Ishawo Agric Ikorodu Lagos","s":"Lagos"},{"n":"Bismedi and mart 1 PMS","a":"30 imalete road elesekan,elesekan bus stop ibeju lekki","s":"Lagos"},{"n":"Fulfilled PMS","a":"JB Ayeni street igbojia town shapati/Imalete bus-stop","s":""},{"n":"Afolashade store","a":"Elesekan Imolete NO :8 edogun street","s":""},{"n":"May & Baker LGS","a":"","s":""},{"n":"Gwadayi pharmacy","a":"Sheka gidan leda","s":"Kano"},{"n":"Raymine Hospital","a":"Raymine Hospital, Rumuodomaya Port Harcourt","s":"Rivers"},{"n":"BENEZE PHARMACY","a":"113 Apata Street palm Grove shomolu","s":""},{"n":"GOLDEN CHUKS PHARMACEUTICALS LIMITED","a":"42 JAGUNMOLU STREET BARIGA ADJACENT JUSTRITE SUPERMARKET","s":"Lagos"},{"n":"ILham Medical and Wellness services","a":"Yar kasuwa, Haye, Ringroad, kano.","s":"Kano"},{"n":"A&O Pharmacy","a":"13 Odemuyiwa Street by Seliat B/Stop","s":""},{"n":"Nana Aisha PMS","a":"Af 45 dabba rd unguwan sunusi tudun wada kaduna","s":"Kaduna"},{"n":"Nelly care Botanical Home and Maternity","a":"Ekede heights, Williams street Udu Local govt Area","s":""},{"n":"Jjaned Specialist Hospital","a":"1, Jerry Nwakodo street, Beside Lekki Gardens, Ajah Expressway, Ajah","s":"Lagos"},{"n":"Meg-harry pharmacy and stores","a":"8 new ogorode road near shell road junction. Sapele","s":"Delta"},{"n":"Goodluck pms","a":"No 60 Gangara street ungawan Sunday","s":""},{"n":"Poly patent medicine store","a":"No38 shamgbagyi street romi","s":"Kaduna"},{"n":"Maryam pms","a":"Graceland zaria","s":"Kaduna"},{"n":"Opeyemi store","a":"2 captain billiaminu close orofun ibeju Lekki","s":"Lagos"},{"n":"Arak pharmacy kano","a":"Tudun yola, kano","s":"Kano"},{"n":"Manful pharmacy","a":"140 udo ekpo mkpo street off nwaniba road uyo","s":"Akwa Ibom"},{"n":"JJ and Fejis pharmacy and stores","a":"Along Abraka/Abbi road After Ese Jones hotel before Oderhi Filling station","s":"Delta"},{"n":"Emmadoc PMS","a":"102, Unity Road, Alakuko","s":"Lagos"},{"n":"EVERTOB CONCERNS PMS","a":"18 Mashebinu street ulom bus stop Ajangbadi OjO","s":"Lagos"},{"n":"Kemmad Ventures","a":"10 Ifelodun street Abule Egba Lagos","s":"Lagos"},{"n":"Lolade PamS","a":"24, Egunsola Street, Abule Egba, Ifako Iajiye, Lagos","s":"Lagos"},{"n":"Maryy pms","a":"8,Aliu street, Egbe Alimosho","s":"Lagos"},{"n":"ISDEC PM'S","a":"Sarki junction yakowa Express way karji kaduna","s":"Kaduna"},{"n":"De Maggio","a":"1 Egbe Road Ikotun","s":"Lagos"},{"n":"Abidek pms","a":"19 sholawon street igbogbo","s":"Lagos"},{"n":"The Great PMS","a":"No 1 Udojisu Imeke, Opp, Town Hall Imeke, Badagry","s":"Lagos"},{"n":"Mustard Seed PMS","a":"9, Ahmed polo, off liberty Estate. Okokomaiko","s":"Lagos"},{"n":"Godheals pms Romi","a":"No. 1 Idi street Romi","s":"Kaduna"},{"n":"CHOICE PHARMACY ( Ebute Metta)","a":"5 savage Street Ebute metta","s":"Lagos"},{"n":"Hybrid Integrated Pharmacy Ltd","a":"5, British American Junction Jos.","s":"Plateau"},{"n":"Olaoluwa pms (Ori Okuta)_","a":"19, Sanusi Adegoke St.Ori Okuta off Idi Orogbo","s":""},{"n":"Magcare Pharmacy","a":"No1b igwe liga street, Harraca Junction Abakiliki, Ebonyi state","s":"Ebonyi"},{"n":"Maman Abba kd pms","a":"No3 bala solawa by makarfi road rigasa","s":"Kaduna"},{"n":"Adam patent medicine store","a":"Dan galadima road hayin dan mani kaduna After Iman","s":"Kaduna"},{"n":"Anty Zainab PMS","a":"No1 Jaji Road Abakpa","s":"Kaduna"},{"n":"Adams Patent Medicine Store","a":"No. Sabon kasuwa road rigasa kaduna","s":"Kaduna"},{"n":"Neem Pharmacy ltd","a":"Along Ugbomro Road Adjacent holy Trinity Catholic Church Ugbomro-Effurun","s":"Delta"},{"n":"Chibest Chemist 2","a":"No32 unity bus stop bayeku ikorodu","s":"Lagos"},{"n":"KRA Nalele Pharmacy Jos","a":"68/13 Mango street, Jos North","s":"Plateau"},{"n":"Abuja Central Medical Stores (ACMS)","a":"3C6M+XQ5, Unnamed Road, Utako, Abuja 900108, Federal Capital Territory","s":"FCT"},{"n":"Longing Medical Centre","a":"3-5 Josepha Close, Off Ogundeji Oguntona St., By Ajala Bus-Stop, Off Lagos-Abeokuta Expressway, Ijaiye-Ojokoro, Lagos","s":"Lagos"},{"n":"National Obstetric Fistula Centre ,Abakaliki, Ebonyi state","a":"National Obstetric Fistula Centre Abakaliki, Ebony state Along Enugu Expressway","s":"Ebonyi"},{"n":"OKEYSON MEDICINE SUPER STORE","a":"No 9 MAGAJIN GARI STREET GONINGORA KADUNA","s":"Kaduna"},{"n":"Active aid pharmacy & stores","a":"Adeoni estate,Ojodu berger","s":"Lagos"},{"n":"FEDERAL MEDICAL CENTER AZARE","a":"Bauchi","s":"Bauchi"},{"n":"Yousra Pharmacy & Mini Mart Stores Limited Katsina","a":"2, Nakowa House Opp UBA, IBBway, Kofar kaura layout Katsina, Katsina state","s":"Katsina"},{"n":"Zaima Pharmacy","a":"suite 4-11, bolori shopping complex lagos street maiduguri","s":"Borno"},{"n":"Prospero Pharmacy","a":"109 Chinda Road, Off Ada George Road","s":"Rivers"},{"n":"Shehu m pms","a":"No 67 Anguwan fada yakawada","s":""},{"n":"Adams pms","a":"102 school road romi kaduna","s":"Kaduna"},{"n":"Advantage PMS","a":"No 8 Omolara Street Awoyaya Ologufe bus stop","s":"Lagos"},{"n":"Health is wealth PMS","a":"2 Dauda Street, Ojo Alaba sabo, oniba. Celebusstop.","s":"Lagos"},{"n":"Tessymartins ppmvs","a":"1olufemi Adenigba street mosafejo ojo Alaba Lagos","s":"Lagos"},{"n":"Iktex Chucky's Pharmacy Ltd","a":"26 opp idheze road ,irri","s":"Delta"},{"n":"JiPharma Jigawa State","a":"Dutse","s":"Jigawa"},{"n":"Winner pms","a":"No 35Ashehu street mondo","s":""},{"n":"Surayya pms","a":"No 12 Ayuba Madaki Street off Abuja Road Rigasa Kaduna","s":""},{"n":"VICTOR PMS","a":"Laying alh nura kauran wali","s":""},{"n":"Sauki lawal pms","a":"Angular waziri hangars giwa","s":"Kaduna"},{"n":"Hibba PMS","a":"Garba Raba by Shannon road Rigasa","s":"Kaduna"},{"n":"Al Ihsan Ai pms","a":"Rigasa Kaduna","s":"Kaduna"},{"n":"C .Y . PMS","a":"Nk 12 Arochukwu Road Kaduna","s":"Kaduna"},{"n":"Al-mahmud pms","a":"Mashi gwari by l/hakimi rigasa after distric head office","s":"Kaduna"},{"n":"Bahin-Bahin pms","a":"No 285B any kaura Zaria city","s":"Kaduna"},{"n":"Sholinks medicals","a":"Angwa kabiri close to Ecwa church Narayi","s":"Kaduna"},{"n":"Medrackhealth Pharmacy","a":"1 Imowahen close off Gaius Idubor Street, Off Gapiona Road, GRA Benin City Edo State","s":"Edo"},{"n":"Annox Nigeria Limited","a":"No 1, UNTH Road, Enugu","s":"Enugu"},{"n":"Alheri chemist","a":"no53 Albarkawa Zaria city","s":"Kaduna"},{"n":"Divine medicare","a":"Ajegunle by Madona sign board no 3A Mpape","s":""},{"n":"Taimakon Al-umma p.m.s","a":"No: 8 jumare road Rigasa Kaduna","s":"Kaduna"},{"n":"Health First Medicine","a":"No 8 Ogunfayo palace road 1","s":""},{"n":"Maman Fatima PMS","a":"Hayin Malam Bello","s":""},{"n":"Joset PMS","a":"No. 1 Express Junction Road Anvwan-Godo Sabon-Zaria, Kaduna State","s":"Kaduna"},{"n":"A1 Pharmacy & Stores","a":"Besides Sawmill, Igbole, Igboora","s":""},{"n":"Hosanna pms 2","a":"No 4 liman street mil goma","s":""},{"n":"Alehsan j pms","a":"New jos road nagoyi zaria","s":""},{"n":"Maimuna Ibrahim Halilu","a":"HAYIN Mallam zangon Shanu, zango","s":""},{"n":"MZ PMS","a":"No 67 Shehu idris road tukur tukur","s":""},{"n":"Sauki PMS","a":"Opposite Gidan Sale Mai manja, Unguwan Nupawa, Rimin Kabrai, Laura, Zaria City.","s":"Kaduna"},{"n":"Revaritch","a":"3 Chinedu Obodo Street, Back of Asaba Specialist Hospital Asaba, Delta State","s":"Delta"},{"n":"Amatullah PMS","a":"No. 3 Unguwan Lalle street","s":""},{"n":"Alhidayah ppmv","a":"Number 55 Dankumbo junction rimin tsiwa zaria city","s":"Kaduna"},{"n":"Kgaladima pms","a":"No 2 tsugugi,king road","s":""},{"n":"RHB pms","a":"No 1 nasiru el-rufai road hayin danmani","s":""},{"n":"Destiny ppmv","a":"22 Benin street sabon gari Zaria","s":"Kaduna"},{"n":"Marafa pms","a":"Yahya galadima road Rigasa kaduna","s":"Kaduna"},{"n":"Clemtims Pharmacy Limited","a":"No 57, Ebis Road Biogbolo Yenagao.","s":""},{"n":"Fugas Pharmacy and Stores Ltd","a":"No.7 White house street, Agudama Bayelsa","s":"Bayelsa"},{"n":"Ogunmakinwa Rachael","a":"Eseowa street lakowe phase 2 largos","s":""},{"n":"God's mercy patient medicine store","a":"6 komolafe street igando oloja","s":"Lagos"},{"n":"AVON MEDICAL PRACTICE LIMITED","a":"6, Adedamola ojomo close Off Bode Thomas Surulere","s":"Lagos"},{"n":"Crisben Patent Medicine","a":"No 1 pipe line junction ile epo","s":""},{"n":"JUK PHARMACEUTICAL LTD","a":"No 1 Sokoto road, beside VEHICLE INSPECTION OFFICE","s":"Sokoto"},{"n":"Shukuran ppmv","a":"No15Ahmed Makarfi Road kinkinau kaduna","s":"Kaduna"},{"n":"Ajekins pharmacy","a":"9A,Ibrahim Onashokun Street, beside old Nepa office, Ifako-Gbagada","s":"Lagos"},{"n":"SALMANU MUSA","a":"No 25 Kakuri By Limanchi Road Kawo Kaduna","s":"Kaduna"},{"n":"A. Suraj PMS","a":"Falwaya Dammani Rigasa Kaduna","s":"Kaduna"},{"n":"Abu Ismail","a":"Kankara Road","s":""},{"n":"ALHERI PMS IGABI","a":"No 1 Kabiru Street Rigasa","s":"Kaduna"},{"n":"YUSMAR PMS","a":"5 main Road Bus Stop BADARAWA Kaduna North","s":"Kaduna"},{"n":"Farhan ppms","a":"Az 20 faskari road sabon gari tudun wada Kaduna","s":"Kaduna"},{"n":"Shedjo-mbakunih pms","a":"Laying bus stop kamazou kaduna","s":"Kaduna"},{"n":"Hairan PMS","a":"Igabi Road Maraban Jos","s":"Plateau"},{"n":"Zeemoh pms","a":"No 17 collage road UNG dosa","s":""},{"n":"Yan biyu p m s","a":"Bm11kagoro road kasuwa barchi","s":""},{"n":"Health first pms","a":"No A5 college Road unguwar dosa","s":""},{"n":"Fatee pms","a":"Amadu chinchanki Road Kinkinau","s":""},{"n":"Annur Adama PMS","a":"No. GR 4A Yantukwane, Tudun Wada, Kaduna","s":"Kaduna"},{"n":"Yu-haff pms Kurmin Mashi Kaduna","a":"Area 4 no 52 sarki avenue Kurmin Mashi Kaduna","s":"Kaduna"},{"n":"Amina pms","a":"No x 42 matazu road tudun wada kaduna","s":"Kaduna"},{"n":"KADSHMA, Health Supplies Management Agency Kaduna State","a":"No 2 Kakuri United Road , Kakuri Kaduna","s":"Kaduna"},{"n":"Shenbert PMS","a":"221 lewo odo Awoyaya","s":"Lagos"},{"n":"Divine Mercy pms","a":"No 1 OLO street off gbeleyi I dimu Lagos","s":"Lagos"},{"n":"Faith Based Central Medical Foundation Enugu","a":"","s":"Enugu"},{"n":"Adenike facility","a":"9 oketun street ibeju","s":""},{"n":"Melron Lifecare Pharmacy LTD Enugu","a":"EZEIFEM'S COMPOUND EZIAGULU","s":"Enugu"},{"n":"Alheri Danjuma pms","a":"No 63 haying danyaro Samaru Zaria","s":"Kaduna"},{"n":"Ebenezer PMS","a":"No 3Natata street","s":""},{"n":"FORTUNEE PMS","a":"52 Aduronigbagba street ayobo so easy area","s":"Lagos"},{"n":"Success pms","a":"14 Femi Awotedu Kudeyibu est Ijegun_Ikotun","s":"Lagos"},{"n":"Akwa Ibom CMS","a":"State secretariat, IBB way, Uyo","s":"Akwa Ibom"},{"n":"Big friend","a":"Imagbon alade ibeju lekki","s":"Lagos"},{"n":"RICHcare medical and sundry","a":"Berger quarry road","s":"Lagos"},{"n":"Olakike medicine and supermarket","a":"6, Ayegbami street akodo","s":""},{"n":"Alhussana","a":"Unguwan Ganye Kauru LGA","s":""},{"n":"FLOWPET","a":"Railway Track, Otaefun, Osogbo","s":"Osun"},{"n":"Dr Iyeseun Asieba","a":"22, Ahmadu Bello way, Jos","s":"Plateau"},{"n":"FUNUTH PMS","a":"8 Eid Street, Oke Balogun, Epe.","s":"Lagos"},{"n":"Blessed Assurance PMS Ikorodu","a":"Etira St Ebute,Ebute-Iga","s":"Lagos"},{"n":"Annur feggi medicine store","a":"Gaida kano","s":"Kano"},{"n":"TNFpms","a":"1 dagbolu idi roko ogolonto ikorodu lagos","s":"Lagos"},{"n":"Plants And Pills Pharmacy","a":"Oke-Ayo Beside Arije Filling Station Igbeti Oyo State","s":"Oyo"},{"n":"HAUZAIFAN PPM","a":"Shop no 1 layin Rabin Mato Yankaji Birgade","s":""},{"n":"Maryam pharmacy","a":"Gate 1 junction, Gida Dubu Gubi Dam Road Bauchi.","s":"Bauchi"},{"n":"God's Grace pms (Agunfoye)","a":"10 Holy Gabriel street Agunfoye","s":""},{"n":"Maman afra pms","a":"Zanfara road kinkinau","s":""},{"n":"Befinemedics","a":"Opposite gidan Liman makwalla keffi","s":"Nasarawa"},{"n":"Khaj medicine store","a":"Y20 zaria road/abeokuta street","s":""},{"n":"Ashifau Pharmaceuticals LTD","a":"19 Esther Osiyemi Street Ilupeju Lagos","s":"Lagos"},{"n":"De Noble medical","a":"Area command","s":""},{"n":"Titilayo Taiwo","a":"Abiola Tijani St baba adisa ibeju Lekki","s":"Lagos"},{"n":"Peju pms","a":"1 kudus olanrewaju street igbojia bogije","s":""},{"n":"JARE PHARMACY AND STORE","a":"No. 1 General Hospital Road, Sango Eruwa","s":""},{"n":"Chilumex Pharmacy","a":"1 Tedi road progressive estate Tedi opp Ojo Barracks by Canal Bus Stop","s":"Lagos"},{"n":"Sarumi mistura","a":"No26 bakery road bogije","s":""},{"n":"St. David's PPMV","a":"Idasho b/stop,by Dangote Refinery, Ibeju Lekki","s":"Lagos"},{"n":"All well pms","a":"No 9B Halima road","s":""},{"n":"Divine paradise patient medicine store","a":"No 32 Abiola oladuja Street oreyo igbogbo Ikorodu Lagos","s":"Lagos"},{"n":"WABILLAI TAOFEEK PMS","a":"No 80 Offin/ Oreta rd Igbogbo","s":"Lagos"},{"n":"TowerCare Pharmacy","a":"2, Adegoke Ajayi Street Saabo Ojodu Berger","s":"Lagos"},{"n":"Better You Pharmacy","a":"Better you pharmacy opposite pelican hub event center, gbopa ologuneru, Ido road","s":"Oyo"},{"n":"Famjubs Pharmacy","a":"13 pipeline road, Isheri-olofin Idimu Lagos","s":"Lagos"},{"n":"Anisons PMS","a":"No. 31 Halima/Saidu Chiroma Street, U/Sunday., Kaduna.","s":"Kaduna"},{"n":"AL BASHIR PMS","a":"No 1 Aludansidi road banzazzau","s":""},{"n":"Farsac Pms","a":"13 ogabi Street ijede","s":""},{"n":"Gracious pms","a":"H18sani Mohammed street u/Sunday sabo","s":""},{"n":"Rebay Pharmacy, Alakia","a":"Olosan Road, Off Alakia Road","s":""},{"n":"SAVE WAY PMS","a":"7, KASALI OLUWO, CELE BUS STOP, EPE","s":"Lagos"},{"n":"Fon PMS and varieties","a":"#35, kola Agboola street off unity by new road bus stop by Extra fuel station, Awoyaya, Ibeju-Lekki. Lagos","s":"Lagos"},{"n":"blessedsunny1 shop","a":"53 jamiu street awoyaya ibeju lekki","s":"Lagos"},{"n":"Al munawwar pharmacy","a":"Na'ibawa Yanlemo kano","s":"Kano"},{"n":"Gilead patent store","a":"Beside the lords school","s":""},{"n":"Emiloju pms","a":"No39 igbooloko phase 3 Adeba ibeju lekki","s":"Lagos"},{"n":"Ephphatha ppmvl Alatunse","a":"1 Bisiriyu Hassan Quarters Alatunse Town lbeju lekki Lagos","s":"Lagos"},{"n":"Ada pms","a":"No 10 Modile street Teachers quarter Awoyaya","s":"Lagos"},{"n":"Jaywizz care pms","a":"No 3 weloye olarinoye street councilor Awoyaya","s":"Lagos"},{"n":"Ifeoma Paul","a":"No 5 Williams Ude street","s":""},{"n":"Alyusra pms","a":"Cg 17 Musawa Road Tudun wada","s":""},{"n":"Pato patent medicine","a":"Theranex road Ogidon","s":""},{"n":"Limi Children’s Hospital","a":"39 Adetokunbo Ademola Crescent, Wuse 2,","s":"FCT"},{"n":"Super Premium pharmacy","a":"Hallmark, Benin sapele road, Benin city, Edo state.","s":"Edo"},{"n":"Vistatgrace patent medicine shop","a":"No2 Youngest street Lakowe losoro","s":""},{"n":"Yellowmed pharmacy limited","a":"Shop 500 opp holy cross Catholic church, third gate Apo mechanic. Estate","s":"FCT"},{"n":"De - Alot","a":"26 Iwale street beside general hospital Akodo ibeju lekki lagos","s":"Lagos"},{"n":"Excellent shop","a":"okegun museyo town","s":""},{"n":"Divine cyonco. pharmacy","a":"Post office junctions sabo tasha kaduna","s":"Kaduna"},{"n":"Dandangi medicine store shika","a":"Ahamed ganga road shika","s":""},{"n":"Lady B ventures","a":"16,Iposu street,Epe.","s":"Lagos"},{"n":"Nikea Hospital","a":"4B Nike drive","s":""},{"n":"Nobu Pharmacy","a":"74 patani road ugheli, opposite iwhernene junction","s":""},{"n":"Monette Pharmacy","a":"1, College Road, Mosogar","s":""},{"n":"Lilly's pms","a":"No 4, road 4 Greenland estate olokunla, shangotedo","s":""},{"n":"Jessy medical shop","a":"Gbarada cda baba adisa ibeju lekki","s":"Lagos"},{"n":"JB PMS","a":"28/30 ITUNMAGBO STREET POKA, EPE, LAGOS.","s":"Lagos"},{"n":"TOLUWALASHE PMS","a":"25, OMOBORIOWO STREET, 7UP BUS STOP, EGBE, ALIMOSHO","s":"Lagos"},{"n":"Abu-Ammar pms","a":"Kware dawaki ward kauru","s":""},{"n":"TOJU EMI E","a":"Onosa town,old G money Street, lagos state","s":"Lagos"},{"n":"Ileri oluwa pms","a":"3B, Bankole street Off Obajimi Isuti Road Egan.","s":""},{"n":"Okafor Nwanneka Chikodili","a":"Shop A8 ogunfayo royal market ,by eputu road 2 by Danco filling station","s":""},{"n":"Koret Pharmacy","a":"No. 1 Aludele Junction, opposite FCMB Bank, Nsukka, Enugu State","s":"Enugu"},{"n":"Evernorth Services","a":"38 Ajanaku street off Salvation road Opebi ikeja","s":"Lagos"},{"n":"Marvel pms","a":"Big c multipurpose mall, behind total energy filling station, eleko junction, ibeju lekki","s":"Lagos"},{"n":"Akinhelmon Pms","a":"19 kola Ologun street,Ishefun Ayobo, Lagos","s":"Lagos"},{"n":"A.A.B Quality Medics","a":"Block BS Dan gwauro Kano state","s":"Kano"},{"n":"marcx pharmacy","a":"no 83 Al- waha estate adjacent NTA kano","s":"Kano"},{"n":"Mobonike Medical Center","a":"33 surulere street, Dopemu, Agege, Lagos","s":"Lagos"},{"n":"Precious patent and super store","a":"ND20 forcados road Kaduna","s":"Kaduna"},{"n":"blissful Pms","a":"No 13 u/barde,Saxon Tasha","s":""},{"n":"Godstime pms","a":"No1098 television road sabo tasha","s":""},{"n":"Sauki 2 ppmv","a":"Kwassam/kurfi After PHC Kwassam","s":""},{"n":"Auwal Idris","a":"Shargalle road nasarawa kauru","s":"Nasarawa"},{"n":"Byfaith Pharmacy","a":"Km 4, Iwo Ibadan Road, Omobolanle Osogbo, Osun State.","s":"Osun"},{"n":"Dynasty Hospital and Maternity","a":"Onitsha-Nnewi Old Road,Opposite Igwe Adirika's palace by Ifeadigo market Ojoto,Anambra State","s":"Anambra"},{"n":"Jacquette Pharmacy","a":"Mr Maxwell Iheanacho compound Ezeogba, Owerri North,Imo state","s":"Imo"},{"n":"Orinya pms","a":"No 35 kagaro road television","s":""},{"n":"God's time medicine store","a":"No 8 Gwari road television","s":""},{"n":"Adonai pms","a":"Keffi new market road","s":"Nasarawa"},{"n":"Larry pms","a":"No 18 Hausawa road Television","s":""},{"n":"Hasam Pharmacy and Stores","a":"F11, National Mosque Mini Mall, National Mosque, Central Business District, Abuja","s":"FCT"},{"n":"Lamco pharmacy Gyadi gyadi","a":"Opposite teaching hospital","s":""},{"n":"Oum sultan Medicine store","a":"No 3 rimi road dabino street anguwan dankali laying Dan majalisa Dan magaji zaria","s":"Kaduna"},{"n":"Tinuade PMS","a":"Narayi-Maigero Road by water board kaduna","s":"Kaduna"},{"n":"Aunty maimuna pcm","a":"No 111 Ang danmadami zaria","s":"Kaduna"},{"n":"Samphar-medics pms","a":"No. 5 Alkali street mahuta by nnpc junction kaduna","s":"Kaduna"},{"n":"HEALTHBUZZ PHARMACY","a":"23, Akinwunmi Kosemani street, Paiko Idimu","s":"Lagos"},{"n":"Mandela Thomates Pharmacy","a":"Asaba","s":"Delta"},{"n":"Zainab Chemist","a":"Dorawar yan kifi street","s":""},{"n":"Yunusa Shehu pms","a":"U/Dallah Kauru Marbaki Street","s":""},{"n":"ALYAD PHARMACY AND STORES LTD","a":"Masaka jeun number 21 behind st Andrew college masaka karu lga","s":"Nasarawa"},{"n":"Dacto Pharmacy Choba","a":"Wokem Junction Market, East-West Road, Choba Rivers State.","s":"Rivers"},{"n":"Balaraba mai allura ppmv","a":"Number 769 bulbula rimin kebe. Ungogo","s":""},{"n":"DIVINE FAVOUR PMS (OSIBENA)","a":"3, Oshunfunke street, ab oshorun ibeshe owode","s":""},{"n":"Get better healthcare ltd","a":"Shop No 1, off Berger Quarry Road, by jikoko junction Mpape Abuja.","s":"FCT"},{"n":"EMS pharmacy and stores","a":"8 Ezimgbu Link Road GRA Phase IV PH","s":""},{"n":"Sjel Patent Medicine Store","a":"No 84 Jama'a Road Ung/Bisso Sabon Tasha Kaduna","s":"Kaduna"},{"n":"REALS LGS","a":"","s":""},{"n":"Palomino Pharmacy and Stores Ltd","a":"17 Ekpo Archibong Street /Parliamentary Road","s":""},{"n":"Aishat Abdul PMS","a":"No. 219 Zaria Road, Rigasa, Kaduna","s":"Kaduna"},{"n":"Karama","a":"No 13 Rasiraj Rigasa","s":"Kaduna"},{"n":"My Mother Pharmacy","a":"My Mother Pharmacy, No 2, Oke Omi Junction(Isolation Centre), Along Olodo-Lalupon Road, Ibadan","s":"Oyo"},{"n":"AAfrimedics 24 pharmacy &store","a":"Opposite Tipper garage Aso B maraba nasarawa state","s":"Nasarawa"},{"n":"Lifeoak Pharmacy","a":"No 51, Tafawa Balewa Street, Jos.","s":"Plateau"},{"n":"Ibadurrahman Unique Drug Store","a":"Kofar ruwa layin aisha block beside garejin wilala. Kano","s":"Kano"},{"n":"A o pms","a":"No 36 school road romi kaduna","s":"Kaduna"},{"n":"Kadore Pharmacy And Stores","a":"24 Airport Road","s":""},{"n":"Nena Pharmacy","a":"D Lokadang Road, Gurra-topp Rayfield Jos Plateau Nigeria","s":"Plateau"},{"n":"Medhive Pharmacy","a":"69, Wetheral road, Owerri","s":"Imo"},{"n":"Niima Orthopaedic and Diagnostic Clinics","a":"No 5 Niima Close old Airport Road GRA Bauchi","s":"Bauchi"},{"n":"University of Port Harcourt Teaching Hospital","a":"University of Port Harcourt Teaching Hospital","s":"Rivers"},{"n":"Zec pms","a":"No3 Mission street u/boro sabo kaduna","s":"Kaduna"},{"n":"GMCC PMS","a":"No 3 Church Road, U/ ROMI, Kaduna","s":"Kaduna"},{"n":"Able God 2 ppmv","a":"School road no 16 romi","s":"Kaduna"},{"n":"Ideal Ppmv","a":"No 20 koro street Romi kaduna","s":"Kaduna"},{"n":"Tnol Pharmacy and stores","a":"44 Ovie palace road, Effurun","s":"Delta"},{"n":"FASU medicine store","a":"Angwan Tasu Mahuta","s":""},{"n":"Oped Pharmacy","a":"101,Ogoja road near Nourisha fast food","s":""},{"n":"2D-Royal PPMVL","a":"Desa community Road Ibeju Lekki Lagos state","s":"Lagos"},{"n":"El-dunamis medical centers","a":"17 king Solomon street araromi bus stop off Lasu Isheri road Akesan Lagos","s":"Lagos"},{"n":"Sagir medical vendor","a":"0036 unguwar Sarki Yakawada","s":""},{"n":"Mevic PPMVS","a":"No 29 Mevic Avenue opposite Affrinet Blue breeze Event Center Ungwan Maigero Kaduna","s":"Kaduna"},{"n":"Nathybest pms","a":"Unguwan ganye Randa kadi road","s":""},{"n":"Marie Stopes","a":"","s":""},{"n":"Hayfun pharmaceutical limited","a":"2, adekoroye street,off powerline ,iyana ejigbo. Retail pharmacy","s":"Lagos"},{"n":"Lydia pms","a":"25 idowu eletu street awoyaya","s":"Lagos"},{"n":"Cardiocare Hospital","a":"5 Giza Close, off Dunokofia Street Area 11 Garki,","s":"FCT"},{"n":"evertex pharmacy plateau","a":"24 Ibrahim dasuki street jos","s":"Plateau"},{"n":"Rochcare pharmacy wholesale","a":"92, peter odili road , Taco plaza, Portharcourt","s":"Rivers"},{"n":"Brightway pms","a":"Sokoto Road kakuri","s":"Sokoto"},{"n":"Light of God medicine store","a":"Agwan police road ,Masaka, Karu, nasarawa state","s":"Nasarawa"},{"n":"Hero Medical Centre","a":"8, Igunnu Street, By Oja Bus Stop, Orile Iganmu, Lagos","s":"Lagos"},{"n":"OBANI PHARMACEUTICAL LIMITED","a":"No 56 Tobacco area Araromi Junction Oyo","s":"Oyo"},{"n":"JJ patent medicine store","a":"No 2 narayi road, ungwar Sunday","s":"Kaduna"},{"n":"Gods decree pharmacy","a":"#40 Izubia street Akwaka Rumuodomaya pH","s":""},{"n":"Zoe peace patant Medicine store","a":"No 44 auta jagaba Streets Romi new extension kaduna","s":"Kaduna"},{"n":"Hams medicine store","a":"24 gwari road sabon Tasha","s":""},{"n":"Vinah pms","a":"Opposite transformer market kwassam kauru l.g,a kaduna","s":"Kaduna"},{"n":"Standard Trust","a":"10 bagado Road","s":""},{"n":"Hengoz Pharmacy","a":"33/34, Jonathan Coker Road. Fagba","s":""},{"n":"DOVEFORD PHARMACY & SUPERSTORE - OLD GARAGE","a":"Opp. Police Station, Old Garage, Osogbo, Osun State.","s":"Osun"},{"n":"Edstel God's Favour","a":"17,karatudu market gonigora","s":""},{"n":"Crown Hospital Nkpor","a":"Along Nkpor-Umuoji road after Eke Nkpor","s":""},{"n":"Musa Balarabe PMs","a":"Makami kauru","s":""},{"n":"ABU.JUNAIDU PMS","a":"NO1 KUFENA ROAD GYALLESU ZARIA","s":"Kaduna"},{"n":"Alheri medicine store gangaren mobile","a":"No 1 gangaren mobile mai anguwa hause","s":""},{"n":"Maman maryam","a":"Ang magajiya zaria city","s":"Kaduna"},{"n":"Daddy Pms","a":"Opposite central market kauru","s":""},{"n":"Maman Ahmad","a":"Anguan magajiya Zaria city","s":"Kaduna"},{"n":"Zinah PMS","a":"Adjucent to ECWA kwassam kauru LGA Kaduna","s":"Kaduna"},{"n":"Sauki na Allah medicine store","a":"No 42 nagoyi new jos road zaria","s":""},{"n":"Sauki medicine store gangara giwa","a":"No.5 unguwan waziri gangara","s":"Kaduna"},{"n":"Sani rabiu pms","a":"Ung tafida gangara giwa lga","s":"Kaduna"},{"n":"M.M.G P.M.S.","a":"GANGARA UNGUWAR DAN MADAMI,","s":""},{"n":"Best Option Abuja Pharmacy","a":"146 B, 3rd avenue, Gwarimpa","s":"FCT"},{"n":"ogbu senior","a":"Eleku close Araromi ibeju Town","s":""},{"n":"Best Choice Hospital Kano","a":"Taludu Kano Aminu Kano Way","s":"Kano"},{"n":"Fajib pharmacy","a":"1146 yar akwa kano(gidan arab) kano","s":"Kano"},{"n":"University of benin teaching hospital","a":"Ugbowo, benin city","s":"Edo"},{"n":"Falala Hunkuyi patient medicine store","a":"Tashan mama Hunkuyi","s":""},{"n":"Nazee pms","a":"Anguwan waziri hunkuyi kudan local government Kaduna state","s":"Kaduna"},{"n":"STATE SPECIALIST HOSPITAL OSOGBO","a":"State Hospital Asubiaro, Osogbo","s":"Osun"},{"n":"Chi -Chi & Chi PMS","a":"1 Oluwaseun street, hostel bus stop Agodo Egbe Lagos","s":"Lagos"},{"n":"Xicto pms","a":"Kaura wali kudan","s":""},{"n":"Liman Abdullahi P.M.S","a":"Kauran wli","s":""},{"n":"ABRAB pms kudan","a":"TASHAR MUSA TUDUNWADA KUDAN","s":""},{"n":"Bashir Idris likoro pms","a":"No17anguwan karofi likoro","s":""},{"n":"NB Gaskiya medicine Store Likoro","a":"No 54 Anguwan Liman Likoro, Kudan LG Kaduna","s":"Kaduna"},{"n":"Kako p m s","a":"Kadage kauru lga Kaduna state","s":"Kaduna"},{"n":"Tugak Pharmacy","a":"19, Peter Odilii Road","s":""},{"n":"Kano State DMA","a":"kano state","s":"Kano"},{"n":"Babangida patient medicine store","a":"Along kauru Pambegua road yadin kauru opposite alhaji ali house kauru local government area.","s":""},{"n":"SAUKI PPMV","a":"Emir palace,s kauru","s":""},{"n":"ALKHAIRI PMS KAURU","a":"SABON TASHA ALONG KADAGE ROAD KAURU","s":""},{"n":"RACHEAL PMS","a":"No 14 Alikali road kabala west kaduna","s":"Kaduna"},{"n":"RB PMs","a":"Sabon Tasha kauru","s":""},{"n":"Alheri medicine pms","a":"No12anguwan karofi likoro","s":""},{"n":"Lorys Pharmacy","a":"Parklands","s":""},{"n":"NADRIL MEDICINE STORE","a":"No 19 Maje Road Tudun Wada Zaria","s":"Kaduna"},{"n":"Odinsco Pharmacy and Stores, Nasarawa","a":"Beside Primary Healthcare Centre, Angwan Waje, Nasarawa State","s":"Nasarawa"},{"n":"Sauki pms zaria","a":"Kwarbai layin makabarta","s":"Kaduna"},{"n":"Yan uku pms","a":"No 164 New Banzazzu","s":""},{"n":"Walida p.m.s","a":"No 163 nagoyi from alhikima","s":""},{"n":"Al falah pharmacy","a":"no 6/7 Ahmadu Bello Way Kano","s":"Kano"},{"n":"Tajmedics Pharmacy","a":"9 Mabinuori St, Somolu, Lagos 102216, Lagos","s":"Lagos"},{"n":"Henicare Pharmacy Limited","a":"24 Adaranijo Street Pedro Road , Bariga , Lagos","s":"Lagos"},{"n":"Ofoma","a":"6th avenue festac town early life road b close","s":"Lagos"},{"n":"Pharmapex pharmacy","a":"29 Asuquo Ekpo Street by Atamunu Street, Calabar South","s":"Cross River"},{"n":"Jimtad Pharmacy","a":"1 Akeju Street, off 55 Apata Street, Somolu","s":""},{"n":"Ummusuhylert medicine store","a":"Tamburawa Kumbotso road","s":""},{"n":"M S N Medicine","a":"Line pump, brigade kano","s":"Kano"},{"n":"Baiti PMS","a":"Dangaladima Road Dammani","s":""},{"n":"NOFIC Katsina, National Obstetric Fistuls Centre","a":"Barbara Ruga Katsina","s":"Katsina"},{"n":"Usiju pms","a":"No 26 Sule Maiganga Street Ungwan Romi","s":"Kaduna"},{"n":"Delta State Drug Revolving Fund","a":"Central area, Asaba, Delta state","s":"Delta"},{"n":"M & E medicine store","a":"No 1 Baba Adidas B/ stop, Igando - Oloja","s":"Lagos"},{"n":"Nanky Pms","a":"26, yamusa street UNGWAN Pama kaduna","s":"Kaduna"},{"n":"Judyson pms","a":"No 37 majalisa street ungwan yelwa television kaduna","s":"Kaduna"},{"n":"Mufida pharmacy","a":"No 1 madaki road Giwa","s":"Kaduna"},{"n":"Rahama ppmv","a":"Daura road rigasa","s":"Kaduna"},{"n":"Afuwan medicine store","a":"Sabuwar gandu kano","s":"Kano"},{"n":"Fahassus Med store","a":"Buk road opposite nourain hotel","s":""},{"n":"Kelina Hospital Lagos","a":"7, Ologun Agbaje Street, Off Adeola Odeku St, Victoria Island, Lagos","s":"Lagos"},{"n":"Gadaha pms","a":"Kano","s":"Kano"},{"n":"Naliron pharmacy","a":"Number 44 Joseph gomwalk way opposite old PRTV station jos","s":"Plateau"},{"n":"Kelina Hospital Pharmacy, Abuja","a":"Kelina Hospital, 3rd Avenue, Gwarinpa.","s":"FCT"},{"n":"Gapcare pharmacy","a":"6, igbinidu street, off oko central road. GRA benin city","s":"Edo"},{"n":"ROM PMS","a":"21/23 Ishashi Ibeshe Ikorodu","s":"Lagos"},{"n":"AKPOJOTOR MEGA","a":"No 29 ufoma street ekete inland","s":""},{"n":"Yunusa PMS","a":"28 Ikara road Unguwar muazu kaduna","s":"Kaduna"},{"n":"Field Marketing","a":"Field Marketing","s":""},{"n":"Adedan PMS","a":"2, Ige Junction. Agbenaje, Command.","s":""},{"n":"St. Charles Borromeo Hospital","a":"1 Limca Road","s":""},{"n":"Sycamore pharmacy","a":"76 4th avenue Gwarinpa Abuja","s":"FCT"},{"n":"Jaytop Pharmacy and Stores","a":"1, Oguntade Street, Eyita Ikorodu","s":"Lagos"},{"n":"Raphabalm pharmacy","a":"52, Alekuwodo street","s":""},{"n":"LESCO PHARMACY JOS","a":"Agingi rukuba road Jos , plateau state","s":"Plateau"},{"n":"Esayilo pharmacy Ltd","a":"Nyikangbe Gurara opp. New divine success school minna. Off Bida Road","s":"Niger"},{"n":"De-gideons medical","a":"Laying sarki street kamazou kaduna","s":"Kaduna"},{"n":"Jonrose pharmacy","a":"No. 6, Udumotor quarters, Ekpan, Delta state.","s":"Delta"},{"n":"MUSFATAJ PMS","a":"18 OMONIYI ADENUGA AGUNFOYE IGBOGBO","s":"Lagos"},{"n":"Alhusna PMS","a":"Nahiya Road, Bokon Daji","s":""},{"n":"God Favour PMS","a":"2, Oduloye street. I gbogbo Bayeku","s":""},{"n":"Chrysolite Pharmacy","a":"Opposite MRS Filling Station Olororo Bus Stop Along Challenge - Orita Ibadan","s":"Oyo"},{"n":"Bostay pharmacy ltd","a":"F&F Building,Beside Agape Petrol Station, Apata","s":"Oyo"},{"n":"Endurance Medical","a":"No 58 Baka street angwan yelwa","s":""},{"n":"Wadata pms lakoja road Rigasa Kaduna","a":"Takalafiya Street by Lokoja Road Rigasa Kaduna","s":"Kaduna"},{"n":"Azman pharmacy","a":"NO 2 HOSPITAL ROAD, SHOP NO 6 P.O.B. 954 MAIDUGURI, BORNO STATE","s":"Borno"},{"n":"Med-vical International","a":"Boundary road","s":""},{"n":"Nat K Pharmacy","a":"51 etete road, Benin","s":""},{"n":"Rapha med and stores","a":"Opposite living faith Church Karji maigero road kaduna","s":"Kaduna"},{"n":"RAHMAT P M S","a":"No 4 FUNTUA ROAD GIWA","s":""},{"n":"Erhamedplus pharmacy","a":"62 Etete road, off Adesuwa road. Benin city","s":"Edo"},{"n":"Health_Excel Pharmacy Limited","a":"36 Adeola road,sapele delta state","s":"Delta"},{"n":"Eribek Pharmacy ltd Nasa","a":"Off techno plaza masaka bus stop","s":"Nasarawa"},{"n":"Zenithlife pharmacy & Stores","a":"Domkat Bali Rd, Jos 930104, Plateau","s":"Plateau"},{"n":"Morning Sun Pharmacy Jahi","a":"Iceblock Junction, Jahi, Abuja, FCT","s":"FCT"},{"n":"Kbsalampharmacy Bauchi","a":"Tudun salmanu bauchi","s":"Bauchi"},{"n":"Abbati wudil pms","a":"No:10 Sabuwar unguwa Wudil","s":""},{"n":"Maman Khalid pms","a":"No 13Ruma close Abakpa Kaduna","s":"Kaduna"},{"n":"Pocco LGS","a":"","s":""},{"n":"Greenlife Jaguar","a":"","s":""},{"n":"Micronova V-Care","a":"","s":""},{"n":"Ascent Pharmacy Enugu","a":"52A, Chime avenue, New Haven, Enugu","s":"Enugu"},{"n":"Eketheo medicine store","a":"No 1 Uwalor Road","s":""},{"n":"Evelyn mark","a":"No Ben St ogunfayo lbeju lekki","s":"Lagos"},{"n":"Baxfah pms","a":"7Abule Eko road ijede ikorodu","s":"Lagos"},{"n":"Ilham pms","a":"No2 birnin yero Rd by kabala junction","s":""},{"n":"Jiri Pharmacy","a":"521, upper sokponba road","s":""},{"n":"Rumaisa medicine","a":"Last bus stop rigasa by railway","s":"Kaduna"},{"n":"Ibukunoluwa venture pms","a":"No2 adeba opposite Ayegbami road adeba lakowe ibeji lekki","s":"Lagos"},{"n":"Goscel Pharmacy","a":"30B Ayo Afolabi Street, Baba Ijesha Aboru, Iyana Ipaja Lagos","s":"Lagos"},{"n":"ADAH MEMORIAL PATIENT","a":"No.211 Hausawa sabon titi","s":""},{"n":"KEX PHARMACY LTD","a":"No. 40, Tony Ijeh Street Ogbeowele, Ibusa (Popularly known as Itego)","s":""},{"n":"Dominion","a":"No 9 Halima road sabon tasha kaduna","s":"Kaduna"},{"n":"G-Matt Pharmacy Ltd","a":"2 Ambrose street, along Governor’s Road, Ikotun Lagos","s":"Lagos"},{"n":"RX-OROKI PHARMA SERVICES LIMITED","a":"ILESA ROAD, OPP. OAUTHC PHASE 1, ILE-IFE","s":"Osun"},{"n":"Hamygdalin Pharmacy","a":"Odua shopping complex Idi Ape","s":""},{"n":"St. Patricks Hospital Mile 4 Ebonyi","a":"Mile 4 Hospital, old Enugu-Onitsha road, Abakiliki, Ebonyi state","s":"Ebonyi"},{"n":"Emdilix Pharmacy","a":"02old agbor road","s":"Delta"},{"n":"EROMED PHARMACY and STORES","a":"9 Omorogbe Street, Eyaen","s":""},{"n":"Pharmaways pharmacy","a":"1, Custom Quarters EL-King Ibereko Badagry.","s":"Lagos"},{"n":"Gee's Pharma Services","a":"54, okun mopo road United estate sangotedo lagos","s":"Lagos"},{"n":"Agbaje and sons","a":"Church street Otunla Phase 2","s":""},{"n":"Best Life","a":"26 samba street, lagasa, ibeju lekki","s":"Lagos"},{"n":"Lagos State Central Medical Store","a":"1,Nitel Road , Oshodi","s":"Lagos"},{"n":"Lagos State Health District VI DPS","a":"6b Asabi Cole, Ladegbuwa Plaza, Ikeja","s":"Lagos"},{"n":"ISANGEL Patent Medicine Store","a":"No.15 Galadima street UGWAN BORO after secondary school UGWAN BORO","s":""},{"n":"Jad&Jan Medicals","a":"No 10 a st simon catholic church street .Kaduna, Kaduna State.","s":"Kaduna"},{"n":"Bakay Pharmacy","a":"No 5&6, Nipost plaza, Nsukka Enugu","s":"Enugu"},{"n":"Guardian Medics Pharmacy Limited","a":"54, Musa Ilu Street, Bukan Hari, Lafia.","s":"Nasarawa"},{"n":"Divine miracle PMS","a":"Isokan estate Akobo ujurin Ibadan","s":"Oyo"},{"n":"Mufeedco medicine store","a":"Bamalli Raod Kinkinau kaduna state","s":"Kaduna"},{"n":"Omaxpms","a":"Kujama market","s":""},{"n":"Akachukwu pms","a":"No 1 hospital close off Saliu gate Awoyaya Ibeju lekki Lagos","s":"Lagos"},{"n":"Amfani Clinic","a":"NO 1160B TITIN DANRIMI RIJIYAR LEMO 'A' FAGGE LGA","s":""},{"n":"LiveOn Pharmacy","a":"LiveOn Pharmacy, General Gas, Akobo","s":"Oyo"},{"n":"Family wellness Pharmacy and stores Ltd","a":"Suite 121/122 , Rock of ages mall, adjacent jabi Park","s":"FCT"},{"n":"Chucks pms","a":"39 chiroma street ugwa yelwa television","s":""},{"n":"DIVINE Patent and Medicine store","a":"11, Arisenijo Mabadeje street, Lowa Estate, lkorodu, lagos","s":"Lagos"},{"n":"Trust patient medicine store","a":"No 74 idowu eletu street Awoyaya, ibeju lekki","s":"Lagos"},{"n":"Premiercare Pharmacy","a":"139 okumagba avenue, warri.","s":"Delta"},{"n":"Ogetex PMs","a":"No.95 MC Jewel plaza Sabo - Tasha","s":""},{"n":"Kim Zee Pharmacy Nigeria Limited","a":"Opposite fidelity bank along Enugu-Nsukka Road.","s":"Enugu"},{"n":"Akerele PHC","a":"35A, Akerele Street","s":""},{"n":"Veramary pharmacy","a":"Suite 9 and 10, Milagro Mall by Orchid Hotel Eleganza Bustop, Ibeju Lekki","s":"Lagos"},{"n":"MEENART PMS","a":"Lh 40 layin hakimi by saminu garba street rigasa kaduna","s":"Kaduna"},{"n":"Raham Sadu Pharmacy","a":"12b university of abuja road gwagwalada","s":"FCT"},{"n":"Hindatu pms","a":"Malali close fgc","s":""},{"n":"Modibo Adama University Teaching Hospital","a":"modibo adamawa university teaching hospital","s":"Adamawa"},{"n":"Portal-Health pharmacy LTD. Keffi","a":"Yamusa Rd off Bala Bala street keffi Nasarawa state","s":"Nasarawa"},{"n":"KEN RITA PHARMACY","a":"No 2,kabayi road ,sharp corner maraba","s":""},{"n":"Dipearl pharmacy","a":"85 ekrejebor road ughelli","s":"Delta"},{"n":"Decabbem Pharmacy","a":"Ifa Atai big junction, Oron Road","s":""},{"n":"Niger State Drug and Hospital Consumable Management Agency","a":"NSDHCMA CENTRAL MEDICAL STORE, OFF LADI KWALI ROAD, BEHIND FEDERAL ROAD SAFETY OFFICE TUNGA MINNA, NIGER STATE.","s":"Niger"},{"n":"Idris Dahiru","a":"No. 76 Namadi Sambo road nariya New extension rigasa Kaduna State of Nigeria","s":"Kaduna"},{"n":"Amazon plus pharmacy","a":"37 Joel Ogunaike street opposite duchess international hospital","s":""},{"n":"ROYAL HEALTH PHARMACY","a":"Zone 1 No 140,Dutse Alhaji, Abuja .","s":"FCT"},{"n":"Brightbenbless Nigeria Enterprise.","a":"Seyi Omogunwa Road Lakowe phase 2 Ibeju Lekki Lagos","s":"Lagos"},{"n":"Muhabbat PMS","a":"No. 25 Maigana Road, Tukur Tukur, Zaria","s":"Kaduna"},{"n":"Friends PMS","a":"No 7 Ramalan Yero Road, off Amingo Garage","s":""},{"n":"Mal'akhim Medical","a":"Beside Deeper life bible church, Apo Dutse. Opposite Clovers and suites hotels Apo Dutse","s":"FCT"},{"n":"KIA-MED PHARMACY","a":"No 24, Bankole street, Isheri Magodo, Lagos","s":"Lagos"},{"n":"Edmond Chris Ppmv","a":"12, power line road kola bus stop Alagbado","s":""},{"n":"Bahijja Tijjani Mahmud","a":"Sharada malam","s":""},{"n":"Lady bee ppmv","a":"No 3 Abuja quarters ibeju agbe ibeju lekki Lagos","s":""},{"n":"Mornel healthcare Ent","a":"Sabo tasha before living faith church..","s":""},{"n":"SEAMA PHARMACEUTICALS LTD","a":"Suite 6 Essence plaza close to day spring hotel lusaka street .","s":""},{"n":"Edo state University Teaching Hospital Auchi","a":"Old igara road, Auchi","s":"Edo"},{"n":"D-hub Pharmacy","a":"1, sir Micheal Otedola Estate Joel ogunnaike street, ikeja. GRA Lagos","s":"Lagos"},{"n":"BB patent medicine and supermarket shop","a":"15 Aiyetoro road Ayobo","s":"Lagos"},{"n":"Greenever medical enterprises","a":"13 club street sabon gari Zaria kaduna state Nigeria","s":"Kaduna"},{"n":"Shizal medicine shop and mini mart","a":"Nath plaza by asjam hotel owvian udu road","s":""},{"n":"Biospring health links limited","a":"","s":""},{"n":"Martins Medical Complex","a":"Block Industry, Kurudu Abuja","s":"FCT"},{"n":"Olisa PPMV","a":"Galadima junction by carwash kamazou","s":""},{"n":"Awekares Pharmacy & Stores","a":"44, Showers plaza Okpanam Road Asaba Delta State","s":"Delta"},{"n":"Standpoint Pharmacy","a":"Shelter","s":""},{"n":"Neborhood PMS","a":"2, Alani Lukman Street, Mosan","s":"Lagos"},{"n":"Outlook Med Pharmacy & Stores Ltd","a":"Daki biu jabi no 3 behind market","s":"FCT"},{"n":"Donwonda Global lIMITED","a":"Plot 1236 meerah surple mall abuja fct","s":"FCT"},{"n":"Brittz pharmacy and stores","a":"71 Aka-Etinan Road, Uyo, Akwa Ibom, Nigeria","s":"Akwa Ibom"},{"n":"Atta'awun Pharmacy","a":"Ni 1 Gamji Plaza near Round aboutt Jega Kebbi, Kano","s":"Kano"},{"n":"Afsars patent medicine store","a":"1242 Tudun Murtala behind Jumma'at Mosque Nassarawa local government kano","s":"Kano"},{"n":"Tag care pharmacy","a":"House 1, road 211, Tran-amadi gardens estate, PH","s":""},{"n":"Almadina","a":"Rinji along Emir's palace to kofan gayan","s":""},{"n":"God is Able PMS","a":"4,Shogalu crescent, Eruwen Balogun Ikd","s":""},{"n":"St Philomena's Catholic Hospital","a":"23 Dawson road, Benin city","s":"Edo"},{"n":"Onyebuchi medical","a":"No 6 Awlaw street ugboezeji abakpa Enugu state.","s":"Enugu"},{"n":"His Grace KSP Pharma Ltd Akure","a":"1A, Aule Road Akure","s":"Ondo"},{"n":"Secured Health Pharmacy","a":"7up bus stop, besides Monatan Central Hospital, Monatan Iwo Road Ibadan","s":""},{"n":"MICRONOVA LGS","a":"","s":""},{"n":"GENEITH LGS","a":"","s":""},{"n":"Pharm Ethics LGS","a":"","s":""},{"n":"LAIDER LGS","a":"","s":""},{"n":"Covenant University Medical Centre","a":"Km 10, Idiroko Road, otta","s":""},{"n":"LUMHOG Pharmacy","a":"Buono plaza opposite Oluyemi Kayode Stadium Okesha Ado Ekiti","s":"Ekiti"},{"n":"Maiwada pms","a":"Zango road tudun wada","s":""},{"n":"Royal Infirmary Hospital","a":"Before Cooperative Villas, By Bakery Bus Stop, Badore Road Along Badore Road, Ajah, beside Replenish Supermarket, badore","s":"Lagos"},{"n":"Newgold Pharmacy","a":"opposite ugbowo UNIBEN main gate,","s":""},{"n":"Habibullahi","a":"Pump bus stop","s":""},{"n":"LiveOn pharmacy bodija","a":"No 1, Oluyole way, favour building, New bodija, Oyo state.","s":"Oyo"},{"n":"ELYAKUB CLINIC AND MATERNITY","a":"Bamalli street by lokoja road Rigasa kadunaaduna","s":""},{"n":"Yahaya Gaskia pms","a":"No26 kurkuja road Barnawa","s":""},{"n":"Florafort Pharmacy","a":"Florafort Pharmacy, Behind Ilupeju Baptist Church Sanngo Eruwa","s":"Lagos"},{"n":"JAA-EEZ PHARMACEUTICAL CONCEPT VENTURES","a":"7 Tahir House opposite prime Hub plaza zoo road kano","s":"Kano"},{"n":"IsioCare Pharmacy and Stores","a":"11, Ken Mozie Street , GRA","s":""},{"n":"NYANYA GENERAL HOSPITAL","a":"Nyanya","s":"Nasarawa"},{"n":"Felly yet pms","a":"Argongo road by abeokuta oppt apostolic church","s":"Ogun"},{"n":"PHL PHARMACY LTD","a":"BASSAN PLAZA, CENTRAL BUSINESS DISTRICT, ABUJA","s":"FCT"},{"n":"Salmars Pharmaceutical Ltd","a":"Suite G1 fatima plaza plot 2142, Mambolo street","s":""},{"n":"ELbonj Pharmacy","a":"405B Oron Road,","s":""},{"n":"Reliance Family Clinics Lekki","a":"113 Hakeem Dickson Link Road Lekki Phase 1","s":"Lagos"},{"n":"Reliance HMO Ogba","a":"3, Abiodun Jagun Street, Ogba","s":"Lagos"},{"n":"Cairo Pharmacy","a":"Mudatex plaza, Kofar gadon kaya opposite makkah eyes hospital","s":""},{"n":"CONMED PHARMACY","a":"Shop No. 21-22 Fouad Plaza, 2, Lodge Road, Kano","s":"Kano"},{"n":"Botia Pharmacy","a":"No 53 G Naf Shopping Mall","s":""},{"n":"Ozeed pharmacy & Store ltd","a":"No 116 NTA road by Everday Supermarket ,Mgbuoba PortHarcourt. River state","s":"Rivers"},{"n":"Immaculate Heart Of Mary Specialist Hospital Nkpor","a":"No. 18 Immaculate Heart Avenue Nkpor","s":""},{"n":"ABLE GOD pms","a":"No.41 sarki yarki","s":""},{"n":"Sauki pms kano","a":"Kano municipal","s":"Kano"},{"n":"KWARA STATE EDP","a":"Kwara State Ministry Of Health, Basin, Ilorin.","s":"Kwara"},{"n":"NEW HEIGHTS LGS","a":"","s":""},{"n":"Abundance grace","a":"1 victory villa gate Labora Abijo, Ibeju-Lekki.","s":"Lagos"},{"n":"NAGIDAMEDICS","a":"R1 Community bank Road Anguwan sanusi kaduna.","s":"Kaduna"},{"n":"Alheri pms","a":"Yanbita hayin ojo Sabon","s":"Lagos"},{"n":"Value access pharmacy and stores","a":"2","s":""},{"n":"CHRISILVA PHARMACY BENIN","a":"10, Benin Lagos expressway, opposite Ovbiogie primary school","s":""},{"n":"MAJEMA pharmaceutical","a":"Rijiyar lemo fagge local government","s":""},{"n":"Tabs n more Pharmaceuticals","a":"Franky Mall, opposite shafa filling station plot 775 olusegun obasanjo way, wuye Abuja","s":"FCT"},{"n":"Omolabake Patent Store","a":"Plot 2, zone A, oluwo village, Aroro yerokun, Arulogun road","s":""},{"n":"GG medical CHEW","a":"No3 natana opposite Baptist theology Haying banki","s":""},{"n":"Godfavour patent medicine store","a":"No 34 Baka street unwgan yelwa","s":""},{"n":"Sonie-view pharmacy and stores","a":"75a okpe road sapele","s":"Delta"},{"n":"Relarex Surulere","a":"11, Alhaji Masha, Surulere","s":"Lagos"},{"n":"GWARINPA GENERAL HOSPITAL","a":"FCT","s":"FCT"},{"n":"Joycity Pharmacy","a":"Ughuoton Omadinor road, Odisi junction Besides Judiciary Customary Court Ughuoton warri","s":"Delta"},{"n":"Garki Hospital","a":"Garki Area 8","s":"FCT"},{"n":"SMK Medical Centre Kaduna Polytechnic","a":"SMK Medical Centre Kaduna Polytechnique","s":"Kaduna"},{"n":"HARUNA PMS","a":"No. 2 Mu'azu Road, U/Mu'azu, Kaduna South","s":"Kaduna"},{"n":"Medcentre Pharmacy","a":"13, Udunaka Kalu drive, River Valley Estate. Ojodu","s":"Lagos"},{"n":"Adewusi ppmv","a":"34, New era St Iyana IPAJA","s":"Lagos"},{"n":"Omoclaraheriage store","a":"1 kamimag str,Madiba estate,Gbetu new road busstop awoyaya ibejulekki Lagos state","s":"Lagos"},{"n":"Folorunsho PMS","a":"18, Azeez Olaoluwa street, Orisumbare, Ayobo","s":"Lagos"},{"n":"Ifedeb Pms","a":"55 Peace Estate Road, off Ipaja Command Road, Barracks Bustop.","s":"Lagos"},{"n":"Christycare pharmacy & store ltd","a":"Beside fadem church, shop 6/8 zenab plaza ,ado,karu nasarawa state","s":"Nasarawa"},{"n":"Lady B PMS Igando","a":"9, Funmi Alaka street. Egan Igando","s":"Lagos"},{"n":"ELBE LGS","a":"","s":""},{"n":"Gidan magani","a":"Kwanar dausayi ungoggo local govt, kano","s":"Kano"},{"n":"Adonis Koju Pharmacy and Stores Limited","a":"13, Ala Road, Sijuade Akure","s":"Ondo"},{"n":"Medik-Plus Pharmacy","a":"Adekola Junction, New Ife Road, Iyana Agbala Road","s":""},{"n":"Goodness Medical centre","a":"No 151, Shibiri road Opposite Area Council","s":""},{"n":"Jovial pms","a":"No 23 yakowa road gbagyi villa kaduna","s":"Kaduna"},{"n":"T- medicals","a":"Water intake road Anguwan Maigero Kaduna","s":"Kaduna"},{"n":"JOTAN PMS","a":"5, Anjorin Street, Off Lonlo Bus-Stop","s":""},{"n":"Nasarawa State Drugs and Supplies Management Agency","a":"Low Cost Housing Lafia, Shandam road Lafia","s":"Nasarawa"},{"n":"Bamak Pharmacy","a":"House 8, Zone D, Apo resettlement, Abuja.","s":"FCT"},{"n":"Federal Medical Center Yenagoa","a":"Yenagoa","s":"Bayelsa"},{"n":"Domanis pms","a":"Erunwen road by Goriola bus stop off Awolowo road oke OTA ona.pms","s":"Ogun"},{"n":"Dukawa Patient medicine Store","a":"No 48 Dangaladima Road Rigasa Kaduna","s":"Kaduna"},{"n":"De John legacy pms","a":"Nasarawan Kahuta","s":""},{"n":"Geodeprince Pharmacy","a":"278 Uyo - Nung Udoe, Road.","s":"Akwa Ibom"},{"n":"Queens Specialist Hospital","a":"Apo Resettlement, Martin Ejembi","s":"FCT"},{"n":"St. Nicholas Hospital","a":"57, Campbell Street, Lagos Island, Lagos.","s":"Lagos"},{"n":"SILVER CREST PHARMACY","a":"4 LAMIDO CRESCENT KANO","s":"Kano"},{"n":"PHARMAPLEX PHARMACY","a":"Masallacin Murtala","s":""},{"n":"St Patrick hospital and maternity","a":"6 ogbaru street Independence Layout","s":""},{"n":"Avro Pharma","a":"","s":""},{"n":"VIXA LGS","a":"","s":""},{"n":"Tolaram Wellness","a":"","s":""},{"n":"Mainspring Hospital","a":"Alamu Street, Behind Alade Motors, Ogbomoso High School Area, Ogbomoso","s":"Oyo"},{"n":"Medrackhealth Pharmacy Abuja","a":"1B, Road 4, Zone C, Bmuko-Dutse, Bwari, Abuja.","s":"FCT"},{"n":"Kada Health care and pharmacy","a":"Kada cinemas","s":""},{"n":"Fotizo Pharmacy, Eneka","a":"26 Igwuruta road, Eneka Roundabout","s":""},{"n":"Emsywise Pharmacy","a":"BIU shopping complex 21 Street BDPA Ugbowo Benin City","s":"Edo"},{"n":"Teeplus Pharmacy","a":"No.48 Aroye, off hope junction, old ife road.","s":""},{"n":"Chidox business","a":"Chidox medicine store Makurdi road layin kaji","s":"Benue"},{"n":"Gesundpharm Pharmacy","a":"Beside Faglo Petrol station, Federal Poly Road, Ureje river","s":""},{"n":"Gombe DMA","a":"GRA Gombe state adjacent scholarship board","s":"Gombe"},{"n":"Alshafa health care and more","a":"Kureken Sani Unguwar yamma","s":""},{"n":"Well -Life Pharmacy and Health Care Products Ltd","a":"1, Awedele Link Road,by State Secretariat Junction.","s":""},{"n":"Polycarp Ebigbo","a":"H 22 A one with God c d a offiran ibeju lekki","s":"Lagos"},{"n":"Teal Resources Limited","a":"22 Oluku-Lagos Expressway, Beside Bronze Royal Hotel Oluku Benin City","s":"Edo"},{"n":"SAM-J.MLU PHARMACY NIG LTD","a":"1, gandu junction opposite police public relations school lafia","s":"Nasarawa"},{"n":"Folab Pharmacy","a":"29, pipeline way(Martins bustop) Agboluaje avenue. Ojodu, Akute.","s":""},{"n":"Merry Ehanire Mother And Child Hospital","a":"16, Ruben Agho, GRA, Benin City, Edo state.","s":"Edo"},{"n":"AXA ONEHEALTH LIMITED(MEDICAL CENTRE)","a":"25A MOBOLAJI BANK ANTHONY WAY,IKEJA","s":"Lagos"},{"n":"Mallazil kulli pms","a":"Dangawo bichi","s":""},{"n":"OGUN STATE DMA","a":"State Secretariat, Oke Mosan, Abeokuta","s":"Ogun"},{"n":"Abdulazeez medicine store","a":"No 6 hayin gimba shika","s":""},{"n":"Kiias pms","a":"No 3 ikon Allah house abattoir road Kabala west Kaduna","s":"Kaduna"},{"n":"Shehu Abdulmalik","a":"Ungwa lalili giwa local government","s":"Kaduna"},{"n":"Festy pharmacy Ltd","a":"No 7 old lagos asaba Road asaba delta state","s":"Delta"},{"n":"Gbless businesses venture","a":"Hakimi street janruwa, chukun Kaduna","s":"Kaduna"},{"n":"Funmero pms","a":"4, isale oro Street, lakowe school gate, Ibeju-Lekki, lagos","s":"Lagos"},{"n":"Moboluwaduro PMS","a":"5, alonge street, camp Davies road, ayobo","s":"Lagos"},{"n":"Kanayo Specialist Hospital and Maternity","a":"No 17 Enugu Road onitsha","s":"Enugu"},{"n":"Mamantwins pms","a":"Cu8 musawa road sabon gari tudun wada","s":""},{"n":"Ola's store","a":"5 Adebayo Stella street uraka epe Lagos state","s":"Lagos"},{"n":"Litmus Lifesciences","a":"","s":""},{"n":"Lateefah medicine store","a":"Ring road, opposite chula filling station, kano","s":"Kano"},{"n":"Zulaihatt pms kano","a":"Gadon kaya","s":"Kano"},{"n":"Iykon Pharmacy-Pharmacy","a":"C11/097 Opposite F close 401 road Festac","s":"Lagos"},{"n":"Famous Pharmacy and Minimart","a":"No 2 Ekosodin Road, Ugbowo, Benin City","s":"Edo"},{"n":"NZ PHARMACY","a":"62, Channels TV Road, Isheri Estates Community, OPIC","s":""},{"n":"Triplecare Pharmacy","a":"7 complex road, opposite college of Education","s":""},{"n":"Zions Stone Medical Services","a":"No.3 Nnobi Off Water works road Abakiliki, Ebonyi","s":"Ebonyi"},{"n":"He cares pharmacy","a":"Sun radiation plaza, ughoton/ugbokodo junction","s":""},{"n":"Mt Sinai Pharmacy and stores Ekosodin","a":"Ekosodin Road, Ugbowo Benin City","s":"Edo"},{"n":"AL-ASAD P.M.S","a":"No 3 galadima road Giwa","s":"Kaduna"},{"n":"Oki ppmv","a":"No 18 D. I. C road kakuri gwari","s":"Kaduna"},{"n":"Funmus PMS","a":"9 Palace Road Ijede","s":""},{"n":"Davicious Medicine Shop & Mini Mart","a":"20, Chinwe Mbanugo Avenue, behind B. Y Hotel, Gbetu new road Awoyaya.","s":"Lagos"},{"n":"Ifedayo PMS Ikorodu","a":"2 Abdul Azeri Crescent, MTN Selewu Igbogbo Bayeku","s":"Lagos"},{"n":"Dadasons Pharmacy","a":"NO. 1 RIMIN TSIWA ESTATE, OLD JOS ROAD","s":"Plateau"},{"n":"Sirokochi Nig Ltd","a":"96 Akinlabi Street, Alagbole, Akute road, Ogun state","s":"Ogun"},{"n":"Jotan patent store","a":"5, Anjorin street off iju road. Iju","s":""},{"n":"Debcy PMS","a":"No. 48 Saki Gangara Street, U/Sunday, Kaduna","s":"Kaduna"},{"n":"Hamoud medicare","a":"Behind Afforestation along kuntau road","s":""},{"n":"Akwaugo patent medicine shop","a":"16 Aso-Rock street Bucknor off Isheri Oshun road Oke afa Ejigbo","s":"Lagos"},{"n":"BENARDVIC PHARMACY LTD","a":"1 NTA/APARA LINK ROAD RUMUIGBO PORTHARCOURT","s":"Rivers"},{"n":"Opeoluwa PMS Badagary","a":"14 BaaleIsokan, black sign board","s":""},{"n":"Thank God pms","a":"8,olorunisola road ayobo ipaja lagos","s":"Lagos"},{"n":"G&M PMS Ikorodu","a":"4,Reri Road Oreta igbogbo","s":"Lagos"},{"n":"Zeelife Pharmacy","a":"1 Amaka Street, Owo, Ondo State","s":"Ondo"},{"n":"Double OJR PMS","a":"No 13 Buggai street ungwan pama sabon Tasha,KADUNA.","s":"Kaduna"},{"n":"Beloveth Pharmacy","a":"Temitope shopping complex, beside Winners chapel","s":""},{"n":"D2 Pharmacy and Sundries","a":"31 Ayinke Timson Drive","s":""},{"n":"Thabis store","a":"Opposite BALLE TONIFA QUTARS SEME Border","s":""},{"n":"Ndupat","a":"66 lambe st off Ago palace way Okota","s":"Lagos"},{"n":"Drenorprime Pharmacy","a":"3 Ugbomro Okuokoko Road Ugbomro Delta Nigeria","s":"Delta"},{"n":"Ufuomed pharmacy","a":"147 kwele rd immediately after the Delta state university of science and technology,ozoro","s":"Delta"},{"n":"Alfurqan pms","a":"4 sabon gari road nagoyi zaria","s":"Kaduna"},{"n":"Olaromoke patent medicine store","a":"No 5, Elepete Road,Baba adisa, Ibeju lekki.","s":"Lagos"},{"n":"The LIMI Hospital","a":"1487 Lee Moses Iseko Street, Central Business District, Abuja","s":"FCT"},{"n":"Glokings pharmacy","a":"No 14 circular road polo maiduguri","s":"Borno"},{"n":"Nifemi Patent Store","a":"18, Alaafia street, Moshalashi, Alagbado","s":""},{"n":"Reliance Family Clinics","a":"48 Yaounde Street, Wuse Zone 6, Abuja.","s":"FCT"},{"n":"Fotizo Pharmacy 1","a":"91 Old Aba road , Rumuobiakani","s":"Abia"},{"n":"Miracle","a":"No 55 okeari lakwoe lbeju lekki lagos","s":"Lagos"},{"n":"drprettybeegynaecareconsult","a":"Flat1 Block C Kano Court Gaduwa Housing estate Gudu Abuja","s":""},{"n":"E and I patent medicine shop","a":"Akeem Alaba Street losoro lakowe","s":"Lagos"},{"n":"G and I pharmacy","a":"9 Big Qua road, calabar","s":"Cross River"},{"n":"Cimek Pharmacy Limited","a":"Suite 7/8 OZ Plaza, Opposite Living Faith Junction, Along Nyanya-Karshi Road, Gidan Daya","s":"Nasarawa"},{"n":"Chemik Pharmacy","a":"97 Oluobasanjo road, Port Harcourt","s":"Rivers"},{"n":"Bethsaida Medical Center and Maternity","a":"Plot cl6 pond Street Housing Estate Fegge Onitsha","s":"Anambra"},{"n":"Behold pharmacy and store","a":"Behold pharmacy, adeyi junction ,one man village ,karu ,nasarawa state","s":"Nasarawa"},{"n":"Archimedes pharmacy","a":"No 6 jubilee market Ikare akoko","s":"Ondo"},{"n":"Cerai intervention pms","a":"Sir Alex street gbagyi Villa","s":""},{"n":"Damango pms","a":"No 1 Musa Umar street Mando","s":""},{"n":"GOD'S GRACE882 PMS","a":"5, OJOTA EBUTE ROAD, TEMU, EPE","s":"Lagos"},{"n":"IJEBU ODE LOCAL GOVERNMENT PRIMARY HEALTHCARE BOARD","a":"Ijebu Ode Local Government Secretariat, Itoro","s":"Ogun"},{"n":"Abu.Ahmad pms","a":"Unguwar makeri yakawada","s":""},{"n":"Sadam medicine store","a":"Gaida Abacha Street","s":""},{"n":"Inuwa medicine","a":"Sharada jawn","s":""},{"n":"Chikwado patent store","a":"Barrister street ruga madaki after city college,Karu,nasarawa state","s":"Nasarawa"},{"n":"Taiwo Veronica Olubunmi","a":"5 Olupitan Street Behind Deeper Church Ijede","s":""},{"n":"Docars patient medicine shop","a":"No1 idogun street molete ibeji LEKKI","s":""},{"n":"PHARMALOT LIMITED","a":"Dedebiowu House, Bode Wasinmi Junction, Near BCOS, Bashorun, Ibadan","s":"Oyo"},{"n":"Holat pms","a":"No22 alhaji eletu global road container bus stop. Awoyaya ibeju lekki","s":"Lagos"},{"n":"Damilat pms","a":"4 Ganiyu street aboru iyana ipaja","s":"Lagos"},{"n":"Ericare patent medicine shop","a":"No 4twins street losoro schoolgate bustop","s":""},{"n":"Ola patent medicine shop","a":"61 one with God ofiran onosa ibeju lekki","s":"Lagos"},{"n":"Jomek P M S","a":"7 Ring Road Angwan Dankali Wasasa Zaria","s":"Kaduna"},{"n":"Yinkus Patent medicine Shop","a":"AB1 Kubi street trikania opposite textile labour house Kaduna","s":"Kaduna"},{"n":"S& C PMS","a":"41, TIAMIYU STREET IKOTUN EGBE","s":"Lagos"},{"n":"Sologen Pharmaceutical co. Ltd","a":"Tasha 2 community by Government Secondary School, Along Gwagwa-Karmo Road, Abuja","s":"FCT"},{"n":"Deedan","a":"12 Ukpenu Road beside Zenith bank","s":""},{"n":"Oyake PMS","a":"Mama Nurse shop, Opp. St. Simon Catholic Church, along Gov't Sch Marana Rido Road","s":""},{"n":"Hope ofGlory pms","a":"No 9 Block 10 makera main road","s":""},{"n":"N&N PMS","a":"19 Ayodele Amusa st.off Gbeleyi st off pipeline market bus stop by idimu Police station,idimu lagos","s":"Lagos"},{"n":"resamvic","a":"Papa cement junction, ado ,karu nasarawa state","s":"Nasarawa"},{"n":"Flolog pharmacy","a":"21 Reuben Agho Street, Benin city, Edo state.","s":"Edo"},{"n":"PHARMARUN PHARMACY","a":"12B, Jose Maria Escriva Crescent, Lekki Lagos.","s":"Lagos"},{"n":"Mycare Pharmacy and store","a":"15, Akindele Coker, liasu rd, Ile Iwe bustop, ikotun Lagos","s":"Lagos"},{"n":"Pills Corner Pharmacy Karu","a":"Karu village, Adjacent to Karu Central Mosque, Along Nyanya-Karshi Road, Karu, Abuja","s":"FCT"},{"n":"Vemado-T","a":"174 Ikot Ekpene Road","s":""},{"n":"Salma ppmv","a":"No 5 albarkawa","s":""},{"n":"Obijackson Women and Children Hospital Okija","a":"No. 2 Madonna University Road Okija, Anambra State","s":"Anambra"},{"n":"AkaGod P. M. S","a":"G62 buba road ungwan Sunday","s":""},{"n":"Madonna Catholic Hospital ,Umuahia","a":"Aba road, Umuahia, Abia State","s":"Abia"},{"n":"Maman Mamah pms","a":"Li 25 Gwaza road by kachia street line kosai tudun wada","s":""},{"n":"M.shuaib pmc","a":"No2 airport road opposite TMDK fuel station Mando Kaduna","s":"Kaduna"},{"n":"Ay Distributor","a":"30 Zaria road narayi kaduna","s":"Kaduna"},{"n":"YOUR WELLNESS PHARMACY LTD","a":"NO 1 YAKOWA ROAD ALONG GALADIMA ROAD (POULTRY JUNCTION) KUDENDA","s":""},{"n":"Radiant Life Pharmacy","a":"Radiant Life Pharmacy, 2 adekunle odunlami crescent. Ilupeju, Lagos","s":"Lagos"},{"n":"Infinity store","a":"7, segun ologuro street, ijagemo","s":""},{"n":"Delight PMS","a":"54, Jamiu Raji Street","s":""},{"n":"A.M Gamandi Patent medicine store","a":"Sallari ,qudus, Babbangiji Tarauni","s":""},{"n":"Elshaddy patent store","a":"No 2, agwan cashew junction ,yimi,zuba abuja","s":"FCT"},{"n":"SWIFA LGS","a":"","s":""},{"n":"Scordle Limited","a":"","s":""},{"n":"Sam Pharma LGS","a":"","s":""},{"n":"HOVID LGS","a":"","s":""},{"n":"Ranbaxy","a":"","s":""},{"n":"Chinyere PMS","a":"7, omirinde street, shobo bustop. Egbeda, Akowonjo.","s":"Lagos"},{"n":"Greenhills Pharmacy and Superstores,","a":"38B Suberu Oje Road, Off Abeokuta Expressway, by Casso Bus Stop, Alimosho, Lagos.","s":"Lagos"},{"n":"Ugofrank pharmacy and stores","a":"2 Authority avenue, kudaki road.","s":""},{"n":"Pharmablaze","a":"235 Abak Road Uyo","s":"Akwa Ibom"},{"n":"Tonia Pharmacy, Garki","a":"12 Ogbomosho Street Area 8","s":"FCT"},{"n":"Best man pharmacy","a":"101 shendam road , lafia opposite presidential lodge","s":"Nasarawa"},{"n":"Oluwatimileyin ppmv","a":"Obada estate,off magbon B/ stop, along badagryy","s":""},{"n":"Domsim Patent Medicine Store","a":"14, Folarin Street Moshalashi empire. Yaba","s":"Lagos"},{"n":"Falala Specialist Medical Clinics","a":"old molai road after federal high court polo GRA Maiduguri","s":"Borno"},{"n":"Debbie Medical","a":"No 1 college road Sabo tasha kaduna","s":"Kaduna"},{"n":"Oluwa Loni Glory PMS","a":"8 Ajewole street ibeju","s":""},{"n":"Ockvic Pharmacy","a":"1b Social Club Road, New Oko Oba, Abule Egba","s":"Lagos"},{"n":"Merryson Pharmacy","a":"Number 1 Udo Udoma off Aka Junction","s":""},{"n":"Cobgate Pharmacy and Stores","a":"Shop 2, Dauda-Konkoso Plaza, Prayer Road Junction, Jikwoyi Phase 2","s":"FCT"},{"n":"Chrismed Pharmacy Lokogoma","a":"Shop B13a, Solomon Drive, Lokogoma Plaza, Nzube Estate, Lokogoma","s":""},{"n":"Good health medicine store","a":"No 7 Ungwa gama opposite holy trinity college maraba rido kaduna","s":"Kaduna"},{"n":"Allah is Great","a":"10,akinola street","s":""},{"n":"Eastern Nigeria Medical Centre","a":"30 Amaigbo Lane Uwani Enugu","s":"Enugu"},{"n":"Stamford Pharmacy","a":"No 3, Ogui road, Enugu","s":"Enugu"},{"n":"Anoz pharmacy","a":"52 Aker road Rumuolumeni Port Harcourt.","s":"Rivers"},{"n":"TONYX PHARMACY","a":"188 Old Aba/Port Harcourt road Oyigbo","s":""},{"n":"Hesed Pharmacy Ltd","a":"Beside NNPC Filling Station, Akala Expressway, Ibadan","s":"Oyo"},{"n":"Obinwanne Hospital and Maternity","a":"Obinwanne Hospital and Maternity 19 Uba Street","s":""},{"n":"Grannus Pharmacy","a":"300 upper EKEHUAN ROAD","s":""},{"n":"Samjo medics","a":"Ken-Layo Plaza Bamishi Kuje FCT Abuja","s":"FCT"},{"n":"Makarios pharmaceuticals","a":"1 Oke Oniyo Street Odo oro ikole Ekiti","s":"Ekiti"},{"n":"DEDA HOSPITAL ABUJA","a":"Plot 1847, Cadastral zone B07, Behind ABC cargo office Katampe","s":"FCT"},{"n":"Royal medical","a":"Opp. Alheri schools, Kamazou.","s":""},{"n":"Divine Anorue pms","a":"Hekan School junction Lamigy Gonigora","s":""},{"n":"Gloria Med PMS","a":"16, Adetoun crescent, off Olaniyi street. New Oko Oba. Abule Egba","s":"Lagos"},{"n":"Hadima health care","a":"Farawa gidan yanshia","s":""},{"n":"Nana Aisha Patent medicine store","a":"Behind Hassan Ibrahim Gwarzo Secondary school","s":""},{"n":"Joanex Pharmacy","a":"103 Market Road, Igwuruta","s":""},{"n":"Mercy land Ppmv","a":"No 2,obatedo street ibeju","s":""},{"n":"MED-DEX PLUS NIGERIA LIMITED","a":"10 amokachi lane","s":""},{"n":"Jenyuojo Medicine store","a":"Off chrispark junction. No 1 Hon. Ben Boyi street opposite Greater Tomorrow Academy mararaba","s":"Nasarawa"},{"n":"Chilison Pharmacy","a":"12, Aker Road Rumuolumeni","s":""},{"n":"Enijan medicals","a":"Maigero road by living faith","s":""},{"n":"Slychemist","a":"Kujama market street opposite sam rada filling station","s":""},{"n":"Aframa patent medicine store","a":"Kz 13 bedde road tudunwada","s":""},{"n":"Mr pillzz","a":"Plot 1 first avenue, road","s":""},{"n":"Lilifield antob Pharmacy","a":"Ground floor, Adeniyi House, Opposite new bridge, Mokola roundabout","s":""},{"n":"Silver Brothers Pharmacy","a":"116 Ijesha Road Itire lagos","s":"Lagos"},{"n":"Federal Medical Center Ebutemetta","a":"Lagos railway station, cooper street Lagos","s":"Lagos"},{"n":"Temidara Pharmacy ltd","a":"2, suberu ogunsanya street,beside oba ayangburen palace,before solomade gate, ikorodu,lagos.ikorodu,lagos.","s":"Lagos"},{"n":"Kadetop","a":"41B Aseph Edema street Agbaranje Ikotun","s":"Lagos"},{"n":"Loruphia pharmacy1","a":"40, Somiari tere-ama street, off Abuloma Road, port","s":""},{"n":"Claritas Healthcare Ltd","a":"GRA benin city","s":"Edo"},{"n":"Imam malik Pharmacy","a":"Moduganari behind tashan Kano","s":"Kano"},{"n":"Dokita Pharmacy","a":"124, Jakpa road, Effurun","s":"Delta"},{"n":"Uyiosacare Pharmacy","a":"office address: no 676 upper sokponba Road, old benin/abraka Road, opposite egbe Community Market, benin city","s":""},{"n":"Tims Pharmacy","a":"Jikoyi, karshi road, Kurudu, Abuja.","s":"FCT"},{"n":"Efei Ua-merg PMS","a":"2, Anjorin street, Idimu","s":"Lagos"},{"n":"Amira","a":"X3 Rahama crescent/ Kajuru Road, Kinkinau Kaduna","s":"Kaduna"},{"n":"Umar Dandano Pms","a":"3/5 layin sarki Keke B","s":""},{"n":"De Joe Patent Medicine Store","a":"27 church road romi","s":"Kaduna"},{"n":"SHARLIZEH MEDICINE STORE","a":"18, Auta Jagaba str Romi new extension kaduna","s":"Kaduna"},{"n":"Hyaman medicals","a":"Sabon rail maraba rido kaduna","s":"Kaduna"},{"n":"Joe bless pms","a":"11 Ogunmude street Epe","s":"Lagos"},{"n":"First Dove of Peace Pharmacy Multipurpose Co. Ltd","a":"Sunches plaza no 1 sunches close, off umunano street cashew bus stop, independence layout Enugu.","s":"Enugu"},{"n":"Carevilla Pharmacy","a":"Old coca cola road adjacent First bank ATM,Aregbe, Osogobo","s":""},{"n":"Nature's touch Global","a":"No 37 Akubueze street Abakpa Nike Enugu","s":"Enugu"},{"n":"Goodwill medical centre","a":"Abakpa Umuchigbo","s":""},{"n":"DRUGRITE HEALTHCARE LTD ONE","a":"3 AGBADO STATION ROAD, IJAIYE OJOKORO, LAGOS","s":"Ogun"},{"n":"FOG JASTONY","a":"12 Tozunkahmen Rd Ajara Agamathen Badagry","s":"Lagos"},{"n":"Access Pharmacy","a":"Korodo Block Industry, Abule Ado Ado Soba opposite Gani Adams House Lagos","s":"Lagos"},{"n":"ONEJ PHARMACY","a":"Shop 6 Benemma Complex, NTA ROAD, OFF OKPANAM ROAD","s":""},{"n":"Maman Khalil PMS","a":"No. AP 39 Manchook by Paki Road, Behind Mufnaj, U/Sanusi, Kaduna.","s":"Kaduna"},{"n":"Funmilayo PMS","a":"82, Okoya junction Raji Rasaki Aboru","s":""},{"n":"Siricare Pharmacy","a":"Km 3, Eku-Osubi express opposite Total filling station by mack truck dealers. Osubi","s":""},{"n":"Primacare Pharmacy","a":"45 Aba Road, CFC building","s":"Abia"},{"n":"Bolutife Pharmacy and Store limited","a":"60 Amusa idowu Street, Ijegun","s":"Lagos"},{"n":"Tejjas Pharmacy Ltd","a":"Mararaba","s":"Nasarawa"},{"n":"Natureheals Pharmacy","a":"SHOP 1, TORSENAT ARENA JUNCTION OPPOSITE OKIRIGHWE MARKET, SAPELE.","s":"Delta"},{"n":"Tumise carex PMS","a":"50 Erelu way, Amikanle Alagbado","s":""},{"n":"Mark Twain Nigeria Limited","a":"1 UNTH Road Enugu","s":"Enugu"},{"n":"ABIPAT PHARMACEUTICAL SERVICES","a":"4, Bisi Olatunji Street, Ojodu Abiodun, Ojodu Berger","s":"Lagos"},{"n":"PHARMACARE SUPPORT SEVICES LIMITED","a":"3RD AVENUE J CLOSE HOUSE 9","s":""},{"n":"LIZZY PMS","a":"No26 Idowu eletu street awoyaya","s":"Lagos"},{"n":"MawuCure Pharmacy Idimu","a":"21, Ejigbo road","s":"Lagos"},{"n":"Rosa Mystica Hospital","a":"2B, Bishop Onyeabor street GRA Enugu","s":"Enugu"},{"n":"Neighbourhood PMS","a":"24,Abiodun Aguda Way,Omitoro, Ikorodu","s":"Lagos"},{"n":"Tec-Star Pharmacy","a":"2 Uwa close by Ezekiel Gomos street off Abacha road Mararaba Nasarawa","s":"Nasarawa"},{"n":"Faith PMS","a":"5, Olori ola ore Oshikoya street eyita ikorodu Lagos","s":"Lagos"},{"n":"CIDMAL HEALTH+ Pharmacy Limited","a":"35 Church road, beside point three bar, Agbelekale, Abuleegba","s":""},{"n":"Bin Aliyu medicines stores","a":"No 72 Sarki dauda streetBabban-Saura","s":""},{"n":"Yaa Wahab PMS","a":"Ajara Tako 2, wazobia drive. Badagary","s":""},{"n":"Glorious Health Pharmacy","a":"1, Ita Oja street, white house, odogunyan, Ikorodu Lagos","s":"Lagos"},{"n":"HFDI-MEDIX PHARMACEUTICALS LTD","a":"37 Joseph Dosu Way, Badagry. Lagos State","s":"Lagos"},{"n":"Grace Of God","a":"22 Akingbade street Aboru iyana ipaja","s":"Lagos"},{"n":"Nelcare pharmacy","a":"7 Agboola aina street off Amore ikeja","s":"Lagos"},{"n":"Festaid Pharmacy-Bucknor","a":"18 Isheri Oshun Road Bucknor- Ejigbo","s":"Lagos"},{"n":"Rashaad Pharmacy Nig Ltd","a":"No 3 Sokoto Road Opposite NCAT Palladan Samaru Zaria","s":"Sokoto"},{"n":"Kyaudai ptm","a":"21 alhaji sani dattijo house","s":""},{"n":"Baltimore Pharmacy","a":"Amal plaza, no 13, Onitsha crescent, off Gimbiya str, Area 11, Garki Abuja","s":"FCT"},{"n":"DOVEFORD PHARMACY LTD","a":"Woru Palace, Agunbelewo Osogbo","s":"Osun"},{"n":"AMINU PMS ENTERPRISE","a":"TUDUN JUKUN OPPOSITE GIDAN BARAU HOMA","s":""},{"n":"Toymas PMS","a":"14, Ejire Bello drive, college bustop. Igando road.","s":"Lagos"},{"n":"GODIYA JIB pms","a":"No.5 Tudun Wada Kudan Kaduna State","s":"Kaduna"},{"n":"KALYTO PHARMACY","a":"3, Dangyang House Rayfield RD Jos Plateau state","s":"Plateau"},{"n":"AZEEZCARE PHARMACY","a":"ROAD 5 JUNCTION BESIDE 911 EATERY ARE ROAD IWOROKO","s":""},{"n":"EN Medicine shop","a":"No 55 sani kastina street,off halima road, U/Sunday, Kaduna","s":"Kaduna"},{"n":"EXCELLENT PATENT MEDICINE SHOP","a":"No 999 Sharada Jaen kano","s":"Kano"},{"n":"Ola-Bola Pharmacy","a":"50, Abeokuta Road, Orisun Ayo House, Odo ona- Apata Road","s":""},{"n":"MJC pharmacy","a":"Nine nine hotel,oluwaseyi street, babaode,onibukun,Atan idiroko road","s":""},{"n":"J S M M M PMS","a":"86 TEDI MUWO ROAD OPP OJO BARRACKS","s":"Lagos"},{"n":"Ruly pms","a":"7, peace Ayomikun way command","s":""},{"n":"Gracepms","a":"No,1 MTN busstop ido","s":""},{"n":"Macripcare pharmacy","a":"No. 12 emelu lane Rumunduru portharcourt","s":"Rivers"},{"n":"Blissvine Pharmacy","a":"111 Oroigwe Road, Rumunduru","s":""},{"n":"hasalmedics pharmacy and superstores","a":"Corner piece, federal ministry of works and housing.. opposite Doma filling station Gwagwalada FCT Abuja Nigeria","s":"FCT"},{"n":"Virgin Heart Pharmacy","a":"Opp. catholic church Jikoyi, karshi road, Kurudu, Abuja.","s":"FCT"},{"n":"Oghenefega and Tefe Pharmacy and store","a":"No 1 Osubi Opp Abraka park, Eku road","s":"Delta"},{"n":"Dacto Pharmacare Ltd.","a":"Plot 244 Sani Abacha Road G.R.A III","s":""},{"n":"Nugary Pharmacy","a":"No 19 Ogunu Road","s":""},{"n":"Tesocare pharmacy & stores","a":"67, ogumwenyi Road, Ugbor.","s":""},{"n":"Betamed pharmaceuticals","a":"26 Elioparawon road, Portharcourt","s":"Rivers"},{"n":"Saviour Pms","a":"23 Anipupo street Okeira Ojodu Ikeja","s":"Lagos"},{"n":"Kajane Pharmacy","a":"1 kangole str, behind city college of edu. new commissioner house, karu Nasarawa","s":"Nasarawa"},{"n":"City Gold Pharmacy Old Karu Road","a":"30, Court Road, Old Karu Road, Mararaba, Nasarawa State","s":"Nasarawa"},{"n":"Zoe peace pms","a":"No44 Auta jagaba street romi new extension","s":"Kaduna"},{"n":"GROVERS'S HOSPITAL","a":"81A YUNIS BASHORUN STREET OFF AJOSE VICTORIA, ISLAND LAGOS","s":"Lagos"},{"n":"Reliance HMO, Port Harcourt","a":"3, Rumuola Link Road, off Stadium Road, Port Harcourt","s":"Rivers"},{"n":"Vikhane Pharmacy","a":"217b Nsikak Eduok Avenue","s":""},{"n":"Reliance Family Clinics Ajah","a":"1, Lewis Street","s":"Lagos"},{"n":"ARAPLUS PHARMACY","a":"No 7-9 Oreoluwatofunmi shopping complex beside Fidelity bank Bodija","s":"Oyo"},{"n":"Corede Pharmacy","a":"Opposite St. Davids Hospital, Yidi Arola, Apete","s":""},{"n":"Reliance Family Clinics Ejigbo","a":"89,Isheri Oshun Road, Bucknor","s":"Lagos"},{"n":"Reliance Health","a":"48 Yaounde Street, Wuse Zone 6, Abuja","s":"FCT"},{"n":"Mary Heritage","a":"20 Orisunbare Age mowo street Badagry","s":"Lagos"},{"n":"Marvecks Pharmaceutical Akure","a":"Lajoke House, Ilotin Road, Off Sunday Bus Stop, Ijoka Road, Akure","s":"Ondo"},{"n":"Pharmedix Pharmacy and Stores Limited","a":"53 Cemetery Road, by Ogodo Road, Sapele","s":"Delta"},{"n":"Reliance HMO","a":"32 Lanre Awolokun Street Gbagada Phase 1","s":"Lagos"},{"n":"SOLID ROCK HOSPITAL","a":"Solid Rock Hospital, 6, Akinsanya street, Off Ogunnusi road, Ojodu, Lagos.","s":"Lagos"},{"n":"Pharmaq Pharmacy Nigeria Limited","a":"Plot 285 Phase 3 Water Board","s":""},{"n":"Ameera pharmacy zaria","a":"Tudun wada zaria","s":"Kaduna"},{"n":"Dan Aya wellness store","a":"Kabuga tudun yola","s":"Adamawa"},{"n":"Stevra care pharmacy","a":"Ujevwu town opposite the winners church after the train station","s":""},{"n":"Bola Pms","a":"Zz 17 Ibadan streetby gumel road","s":"Oyo"},{"n":"M and M pms","a":"Kpak crescent mashi road","s":""},{"n":"Elspeth Care pharmacy and store","a":"157 S&T barrack road opp Uselu market","s":""},{"n":"PHITON HEALTH","a":"49B First Amekpa Rd, Ughelli","s":"Delta"},{"n":"Intermight Pharmacy","a":"Journalist estate road beside integral supermarket arepo Ogun state","s":"Ogun"},{"n":"Stairway Pharmacy Ltd","a":"No 45 Ugali Street, Ire-Akari Estate, Isolo Lagos","s":"Lagos"},{"n":"SEDOT PHARMACY & STORES LTD 2","a":"F&T SHOPPING COMPLEX, EBENEZERY JUNCTION, ALAKIA-IYANACHURCH ROAD, IBADAN, OYO STATE","s":"Oyo"},{"n":"Pinecrest Hospital","a":"4 Oludegun Avenue, Int'l Airport Rd, off M/M, Mafoluku Oshodi, Lagos","s":"Lagos"},{"n":"SHILE TOLU MEDICINE STORE","a":"J1 progressive Estate olumo lgbogbo lkorodu","s":""},{"n":"Napo Pharmacy 2","a":"Km 1.5 Igbo-Etche road, Opposite Eneco main gate, Rumukwurushi","s":""},{"n":"Kenny pms","a":"#23 Makarma street u/godo","s":""},{"n":"DETAB PHARMACY","a":"3 NNPC HOUSING COMPLEX ROAD, EKPAN/ EFFURUN","s":"Delta"},{"n":"Isalu Hospitals","a":"49, Kayode Street, Ijaye Road, Ogba,Lagos","s":"Lagos"},{"n":"Ademot PMS","a":"No 13, Nelson Cole Avenue, off Sterling Bank Ifako ijaiye","s":""},{"n":"FKT PMS","a":"10 Akin otiki street off haruna bus stop ikorodu","s":"Lagos"},{"n":"N-siro plus pharmacy","a":"52 Jesse express road, Jesse Delta State","s":"Delta"},{"n":"LUVID PHARMACY","a":"Akadoro/Ugbede junction","s":""},{"n":"Efulecare Pharmacy","a":"31, Old Aba Road","s":"Abia"},{"n":"Al yasrib pharmaceuticals","a":"Rijiyar zaki. Opposite at taslim petroleum Gwale lga kano","s":"Kano"},{"n":"EVERCARE HOSPITAL LEKKI","a":"1 ADMIRALTY WAY, LEKKI PHASE 1.","s":"Lagos"},{"n":"Macojo Pharmacy","a":"No 13 TOS Benson road Ojogbe bus stop along General hospital road Ikorodu Lagos","s":"Lagos"},{"n":"FMC Onitsha","a":"No.3 Awka road ,Onitsha","s":"Anambra"},{"n":"Basic care","a":"No 81 woji road rumurorlu","s":""},{"n":"Anynta Pharmacy","a":"10, kasamu street, shangisja/magodo off CMD road","s":"Lagos"},{"n":"Afokeoghene medicine patent","a":"6 Alhaji Nurudeen Street Olowopopo Gbetu New Road","s":""},{"n":"Wondercare Pharmacy","a":"No 1 Owo Multipurpose Cooperative Building Iselu Owo","s":"Ondo"},{"n":"P & G Medical Centre","a":"29, Sanni Labode Street, New oko Oba, Abule egba","s":"Lagos"},{"n":"Light Hospital and Maternity home","a":"15, Olumide Onanubi street, Alimosho","s":"Lagos"},{"n":"IFY medical","a":"19 Obianudo street achara lay out","s":""},{"n":"Poco Pharmacy","a":"POCO Plaza, 136 Ogwashi Ukwu/ Ubulu Uku Rd, Ogwashi Ukwu","s":""},{"n":"Royan Hospital","a":"72, Aina Street, Off Ogunnusi Road","s":""},{"n":"FRESHBURY PHARMACY","a":"Plot 520 Aminu Sale Street. Katampe Extension. Abuja","s":"FCT"},{"n":"Froniz","a":"No2 Ayo street, Aboru, Iyana Ipaja","s":"Lagos"},{"n":"Cavona Healthcare Ltd","a":"21 Akeem Shittu, Ajao Estate, Lagos.","s":"Lagos"},{"n":"GODSWILL PMS","a":"AGONKANMEH WHITE HOUSE BADAGRY","s":"Lagos"},{"n":"Amfani pms kwangila","a":"Opposite LEA Primary School Kauran Dole Kwangila,Sabon Gari LGA","s":""},{"n":"Amir Drugs store","a":"Dogarawa, kwantaresha opposite mtn mass gidan sarkin Dillalai","s":""},{"n":"Double grace medicare","a":"Abakpa, Nike road Enugu","s":"Enugu"},{"n":"Famedix Pharmacy","a":"Arca Santa Plaza, Offa Garage Road Ilorin","s":"Kwara"},{"n":"Whyte waters pharmacy","a":"Shop 7 Governor plaza new Rd by ireto junc sapele Delta State","s":"Delta"},{"n":"PREMIUM TRUST PPMV","a":"No 14 Angwan Tanko Gonin Gora","s":""},{"n":"Ololade ventures","a":"111 cele oke eletu","s":"Lagos"},{"n":"Mirror of Life Pharmacy","a":"2nd Gate Jamboree, Coal Camp, Enugu.","s":"Enugu"},{"n":"Janora Pharmacy","a":"Queen junction oluku","s":""},{"n":"Zaad Pharmacy","a":"6, Victor Olaleye Street, Rogo Bustop, Ishaga, Lagos","s":"Lagos"},{"n":"Kemade Pharmacy","a":"Before Makogi Police station, Makogi, Magboro-Akeran, Ogunstate","s":""},{"n":"Ivan care pharmacy","a":"No 2 Uduere road, agbhara junction. Ughelli","s":"Delta"},{"n":"CHRISKEN PHARMACY AND STORES","a":"Old Sapele Road by Netete Street, Ohoghobi, Benin city","s":""},{"n":"ALLAH magani pms","a":"No 11 zango by ma'azu Road T/wada kaduna","s":"Kaduna"},{"n":"CityHill Pharmacy Ltd","a":"CityHill Pharmacy, Opposite Charissa fast food, Airport road, Warri","s":"Delta"},{"n":"First Millennium Pharmacy","a":"Behind Crushed Rock, Opposite Pantaker. Mpape District","s":"FCT"},{"n":"LIFESAVERS PHARMACY","a":"371, Upper siluko road, Opp, Eweka Junction, Egor Quarters","s":""},{"n":"Hekares pharmacy and stores Ltd","a":"35 Erediauwa St","s":""},{"n":"CMargs Pharmacy","a":"shop 1 1st avenue, 2nd cornershop efab est, Lokogoma","s":""},{"n":"Auwal patent medicine store","a":"Dogarawa layin Barazana sabon gari","s":""},{"n":"Ash-Shifa Pharmacy","a":"NO 14A Media House plaza, Club Road, Kano","s":"Kano"},{"n":"AMIR PMS","a":"No 95, Rigachikun Road","s":""},{"n":"3G pharmacy","a":"7B Uzama Street, Oliha, Siluko Road","s":""},{"n":"Sanzito patent medicine and supermarket","a":"46, Ojodu Alagbole Road Mubarak Bus Stop Akute","s":""},{"n":"Kingpen pharmacy","a":"No 6 Uzama road off upper sokponba road, Egba community","s":""},{"n":"Telemedicine Reliance HMO","a":"32 Lanre Awolokun Street Gbagada Phase 1","s":"Lagos"},{"n":"LeelaGod medicals","a":"109 akpa anaka street Egbelu, Akami, Portharcourt","s":"Rivers"},{"n":"Virgin SP1983 Pharmacy Ltd","a":"Plot 392 New GRA (Tanker Park) Trans-Ekulu Enugu","s":"Enugu"},{"n":"Ben and Becks' Pharmacy","a":"12, akhionbare street, off ihama road","s":""},{"n":"Benshelyn Pharmacy","a":"4, Emiye Road, Oleh","s":""},{"n":"Wima Pharmacy","a":"No 18 Akpagha Street Ugboroke Off Airport Road Uvwie Local Government","s":""},{"n":"Shipsy Test Retailer","a":"17 Acme Road, Ikeja road","s":"Lagos"},{"n":"CUSTOMER1","a":"Lagos","s":"Lagos"}];
const CUSTOMER_SEED_BY_KEY={};
CUSTOMER_DIRECTORY_SEED.forEach(c=>{ CUSTOMER_SEED_BY_KEY[c.n.trim().toLowerCase()] = {name:c.n, address:c.a, market:c.s||''}; });

function customerKey(name){ return (name||'').trim().toLowerCase(); }

// Effective record for a customer name: a saved Firebase override (an
// admin's correction, or a customer added since the CSV import) always
// wins over the seed import; falls back to the seed; null if never seen.
function getCustomerRecord(name){
  const key = customerKey(name);
  if(!key) return null;
  const override = customerDirectory[key];
  const seed = CUSTOMER_SEED_BY_KEY[key];
  if(override) return {name: override.name || (seed?seed.name:name), market: override.market||'', address: override.address || (seed?seed.address:'')};
  if(seed) return {name: seed.name, market: seed.market||'', address: seed.address||''};
  return null;
}

// All known customer names (seed + any Firebase-only additions), for search.
function allCustomerNames(){
  const names = new Map(); // key -> display name
  CUSTOMER_DIRECTORY_SEED.forEach(c=>names.set(c.n.trim().toLowerCase(), c.n));
  Object.values(customerDirectory).forEach(o=>{ if(o.name) names.set(customerKey(o.name), o.name); });
  return names;
}

// Saves/updates a customer's market in Firebase whenever an order is
// created with a market that differs from what's currently on file for
// that name (a correction to a wrong CSV guess, filling in a previously
// blank one, or a brand-new customer entirely) — so the next time anyone
// searches/selects this customer, the corrected value is what autofills.
function saveCustomerMarketIfChanged(name, market){
  const key = customerKey(name);
  if(!key || !market) return;
  const current = getCustomerRecord(name);
  if(current && current.market === market) return; // already on file with this value — nothing to save
  wref('customerDirectory/'+encodeFbKey(key)).set({
    name, market,
    address: current ? current.address||'' : '',
    updatedAt: new Date().toISOString(),
    updatedBy: currentAdmin?.role || 'Admin'
  });
}
// Firebase keys can't contain . # $ [ ] / — customer names occasionally do
// (e.g. "St. David's PPMV"), so percent-encode the lookup key into
// something Firebase accepts, rather than dropping/mangling those characters.
function encodeFbKey(key){ return encodeURIComponent(key).replace(/\./g,'%2E'); }
function decodeFbKey(key){ return decodeURIComponent(key.replace(/%2E/gi,'.')); }

function closeCustomerSuggestions(){
  const el = document.getElementById('order-customer-suggestions');
  if(el){ el.classList.add('hidden'); el.innerHTML=''; }
  orderCustomerSuggestionsList = [];
}

function onOrderCustomerInput(){
  const box = document.getElementById('order-customer-suggestions');
  if(!box) return;
  const q = document.getElementById('order-customer-input').value.trim().toLowerCase();
  if(!q){ closeCustomerSuggestions(); return; }
  const names = Array.from(allCustomerNames().values());
  // Rank names starting with the query above names that merely contain it,
  // then alphabetically — makes exact/near matches surface first in a
  // 1,000+ entry directory instead of being buried by scroll order.
  const starts = [], contains = [];
  names.forEach(n=>{
    const ln = n.toLowerCase();
    if(ln.startsWith(q)) starts.push(n);
    else if(ln.includes(q)) contains.push(n);
  });
  const results = starts.sort((a,b)=>a.localeCompare(b)).concat(contains.sort((a,b)=>a.localeCompare(b))).slice(0,8);
  if(!results.length){ closeCustomerSuggestions(); return; }
  orderCustomerSuggestionsList = results.map(n=>getCustomerRecord(n));
  box.innerHTML = orderCustomerSuggestionsList.map((rec,i)=>
    '<div class="customer-suggestion-item" onmousedown="event.preventDefault();selectOrderCustomer('+i+')">'+
      '<div class="customer-suggestion-name">'+escHtml(rec.name)+'</div>'+
      '<div class="customer-suggestion-market">'+(rec.market ? escHtml(rec.market) : 'Region unknown — will save when you enter it')+'</div>'+
    '</div>'
  ).join('');
  box.classList.remove('hidden');
}

function selectOrderCustomer(i){
  const rec = orderCustomerSuggestionsList[i];
  if(!rec) return;
  document.getElementById('order-customer-input').value = rec.name;
  document.getElementById('order-market-input').value = rec.market || '';
  closeCustomerSuggestions();
}

// Keyboard-only / paste fallback: if what's typed exactly matches a known
// customer and the market field is still empty, autofill on blur too —
// covers admins who type the full name instead of picking from the list.
function onOrderCustomerBlur(){
  setTimeout(()=>{
    closeCustomerSuggestions();
    const nameInput = document.getElementById('order-customer-input');
    const marketInput = document.getElementById('order-market-input');
    if(!nameInput || !marketInput || marketInput.value.trim()) return;
    const rec = getCustomerRecord(nameInput.value);
    if(rec && rec.market) marketInput.value = rec.market;
  }, 150); // delay so a click on a suggestion (onmousedown) fires before this closes the list
}
let putawayInProgress={}; // {workerId: {supplier, startedAt}} — persisted to Firebase so an in-progress putaway survives a closed tab or crash
const ADMIN_PERMISSIONS=[
  {key:'approve',label:'Approvals'},
  {key:'scanner',label:'Scanners'},
  {key:'orders',label:'Orders'},
  {key:'analytics',label:'Analytics'},
  {key:'outbound',label:'Outbound'},
  {key:'reports',label:'Reports'},
  {key:'messages',label:'Messages'},
  {key:'ledger',label:'Ledger'},
  {key:'sheets',label:'Integrations'},
  {key:'manage',label:'Workers'},
  {key:'admins',label:'Admins'}
];
function isSuperAdmin(a){ return (a||currentAdmin)?.role==='Super Admin'; }
function adminHasPerm(key,a){
  a=a||currentAdmin; if(!a) return false;
  if(isSuperAdmin(a)) return true;
  if(!a.permissions) return true; // legacy admins created before roles existed keep full access
  return !!a.permissions[key];
}
function applyAdminPermissionVisibility(){
  document.querySelectorAll('.admin-only').forEach(el=>{
    const perm=el.dataset.perm;
    const allowed = !perm || adminHasPerm(perm);
    el.classList.toggle('visible', !!currentAdmin && allowed);
  });
}
let settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null')||{autoSync:false,manualOnly:true,scriptUrl:'',lastSync:null,slackWebhookUrl:'',slackAutoSend:false,slackLastSent:null,slackLastAutoSendDay:null};
let currentAdmin=null;
let nextWId=1,nextAId=1;
let pendingCheckinWorkerId=null;
// Short-lived per-worker lock so a double tap can't fire two check-in writes
// before the first one round-trips through Firebase.
const checkinInFlight={};
let pendingCheckinShift=null;
let pendingCheckinDevice=null;
const SHIFTS={morning:{label:'Morning Shift',hours:'8:00 AM – 4:00 PM'},night:{label:'Night Shift',hours:'12:00 PM – 8:00 PM'}};
let approveFilter='today';
let ledgerView='summary';
let currentWarehouse='LAGOS_DC';
let activeListeners=[];
const DEVICE_WAREHOUSE_KEY='wh_device_warehouse_v1';

// Warehouse coords
const WAREHOUSE_LOCATIONS = {
  LAGOS_DC:   { lat: 6.5244, lng: 3.3792, label: '🏭 LAGOS_DC' },
  NAIROBI_DC: { lat: -1.2921, lng: 36.8219, label: '🏭 NAIROBI_DC' }
};

function getDistanceKm(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function detectAndLockWarehouse(){
  // Already locked to a warehouse on this device?
  const locked = localStorage.getItem(DEVICE_WAREHOUSE_KEY);
  if(locked && WAREHOUSE_LOCATIONS[locked]){
    setDeviceWarehouse(locked);
    return;
  }
  // Try geolocation with a short 3 second timeout
  if(navigator.geolocation){
    // Fallback after 3 seconds no matter what
    const fallbackTimer = setTimeout(() => { showWarehousePicker(); }, 3000);
    navigator.geolocation.getCurrentPosition(pos => {
      clearTimeout(fallbackTimer);
      const {latitude:lat, longitude:lng} = pos.coords;
      let nearest = null, minDist = Infinity;
      for(const [wh, info] of Object.entries(WAREHOUSE_LOCATIONS)){
        const d = getDistanceKm(lat, lng, info.lat, info.lng);
        if(d < minDist){ minDist = d; nearest = wh; }
      }
      setDeviceWarehouse(nearest || 'LAGOS_DC');
    }, () => {
      clearTimeout(fallbackTimer);
      showWarehousePicker();
    }, { timeout: 3000, maximumAge: 60000 });
  } else {
    showWarehousePicker();
  }
}

function showWarehousePicker(){
  // Show a simple one-time picker modal instead of being stuck on "Detecting..."
  document.getElementById('warehouse-label').textContent = '🏭 Select warehouse';
  const existing = document.getElementById('wh-picker-modal');
  if(existing) return;
  const modal = document.createElement('div');
  modal.id = 'wh-picker-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:16px;padding:2rem;max-width:340px;width:100%;text-align:center;border:0.5px solid var(--border2)">
      <div style="font-size:32px;margin-bottom:12px">🏭</div>
      <div style="font-size:20px;font-weight:700;color:var(--text);font-family:Cambria,serif;margin-bottom:8px">Select your warehouse</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:24px">This device will be locked to the warehouse you select.</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <button onclick="lockToWarehouse('LAGOS_DC')" style="padding:14px;font-size:16px;font-weight:700;border-radius:10px;border:none;background:var(--blue-bg);color:var(--blue-text);cursor:pointer">🏭 LAGOS_DC</button>
        <button onclick="lockToWarehouse('NAIROBI_DC')" style="padding:14px;font-size:16px;font-weight:700;border-radius:10px;border:none;background:var(--green-bg);color:var(--green-text);cursor:pointer">🏭 NAIROBI_DC</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function lockToWarehouse(wh){
  const modal = document.getElementById('wh-picker-modal');
  if(modal) modal.remove();
  setDeviceWarehouse(wh);
}

function setDeviceWarehouse(wh){
  localStorage.setItem(DEVICE_WAREHOUSE_KEY, wh);
  currentWarehouse = wh;
  document.getElementById('warehouse-label').textContent = WAREHOUSE_LOCATIONS[wh]?.label || '🏭 '+wh;
  const sel = document.getElementById('warehouse-selector');
  if(sel) sel.value = wh;
  if(db) loadWarehouseData();
}

// Scoped Firebase path helper
function wref(path){ return db.ref(currentWarehouse+'/'+path); }
// Admins are shared at root level for super admin, per-warehouse otherwise
function adminRef(path){ return db.ref('admins/'+currentWarehouse+(path?'/'+path:'')); }

// ---- FIREBASE SETUP ----
function connectFirebase(){
  const raw=document.getElementById('firebase-config-input').value.trim();
  const errEl=document.getElementById('setup-error');
  errEl.style.color='var(--red-text)';errEl.style.display='none';
  let cfg;
  try{
    // Accept both JS object and JSON. Strip comment lines first (Firebase's
    // "Config" snippet usually starts with a // comment before the const line,
    // which otherwise breaks the parser below), then strip a leading
    // "const someName = " wherever it now sits, plus a trailing semicolon.
    const noComments=raw.split('\n').filter(line=>!/^\s*\/\//.test(line)).join('\n').trim();
    const cleaned=noComments.replace(/^const\s+\w+\s*=\s*/,'').replace(/;?\s*$/,'');
    cfg=eval('('+cleaned+')');
    if(!cfg.apiKey||!cfg.databaseURL)throw new Error('Missing apiKey or databaseURL');
  }catch(e){
    errEl.textContent='Could not read config. Make sure you copied the full firebaseConfig block.';
    errEl.style.display='block';return;
  }
  localStorage.setItem(CONFIG_KEY,JSON.stringify(cfg));
  initFirebase(cfg);
}

function initFirebase(cfg){
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('loading-screen').classList.remove('hidden');
  document.getElementById('loading-msg').textContent='Connecting to Firebase…';
  try{
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    db=firebase.database();
    firebase.auth().signInAnonymously().then(function(){
      // Test connection
      db.ref('.info/connected').on('value',snap=>{
        const online=snap.val()===true;
        const dot=document.getElementById('sync-dot');
        const txt=document.getElementById('sync-text');
        if(dot){dot.className='sync-dot'+(online?'':' offline');txt.textContent=online?'Live':'Offline';}
      });
      loadAllData();
    }).catch(function(e){
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('setup-screen').classList.remove('hidden');
      document.getElementById('setup-error').textContent='Auth error: '+e.message;
      document.getElementById('setup-error').style.display='block';
    });
  }catch(e){
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('setup-error').textContent='Firebase error: '+e.message;
    document.getElementById('setup-error').style.display='block';
  }
}

function loadAllData(){
  document.getElementById('loading-msg').textContent='Loading workers and check-ins…';
  detectAndLockWarehouse();
}

function loadWarehouseData(){
  // Detach previous listeners
  activeListeners.forEach(ref=>ref.off());
  activeListeners=[];
  workers=[];checkins=[];admins=[];scannerLogs=[];reports=[];messages=[];production=[];
  reportsFirstLoad=true;prevReportMsgCounts={};messagesFirstLoad=true;prevMessageKeys=new Set();
  batchReports=[];expiryReports=[];batchFirstLoad=true;expiryFirstLoad=true;prevBatchKeys=new Set();prevExpiryKeys=new Set();
  orders=[];
  customerDirectory={};
  putawayInProgress={};

  // Workers
  const wL=wref('workers');activeListeners.push(wL);
  wL.on('value',snap=>{
    workers=[];
    snap.forEach(c=>{workers.push({fbKey:c.key,...c.val()})});
    nextWId=workers.length?Math.max(...workers.map(w=>w.id||0))+1:1;
    // Each render is isolated: before this, a single throw inside renderCheckin
    // (a malformed order, a missing date) escaped the listener callback and the
    // worker list simply stopped reflecting live changes until a full reload.
    safeRender('workers',()=>renderCheckin());
    safeRender('manage',()=>renderManage());
  });
  // Checkins
  const cL=wref('checkins');activeListeners.push(cL);
  cL.on('value',snap=>{
    const raw=[];
    snap.forEach(c=>{raw.push({fbKey:c.key,...c.val()})});
    checkins=dedupeCheckins(raw);
    safeRender('checkin',()=>renderCheckin());
    safeRender('pendingBadge',()=>updatePendingBadge());
    if(document.getElementById('tab-approve').classList.contains('active'))safeRender('approvals',()=>renderApprovals());
    if(document.getElementById('tab-ledger').classList.contains('active'))safeRender('ledger',()=>renderLedger());
    if(document.getElementById('tab-analytics').classList.contains('active'))safeRender('analytics',()=>renderAnalytics());
  });
  // Admins — scoped per warehouse
  const aL=adminRef();activeListeners.push(aL);
  aL.on('value',snap=>{
    admins=[];
    snap.forEach(c=>{admins.push({fbKey:c.key,...c.val()})});
    nextAId=admins.length?Math.max(...admins.map(a=>a.id||0))+1:1;
    if(!admins.length){
      const ref=adminRef().push();
      ref.set({id:1,username:'admin',password:'admin123',role:'Super Admin'});
    }
    // Keep an already-logged-in session's permissions live. Without this, a
    // permission granted or revoked for someone currently logged in (on any
    // device) doesn't take effect until they manually log out and back in —
    // their tabs stay stuck on whatever was true at login.
    if(currentAdmin && currentAdmin.fbKey){
      const refreshed = admins.find(a=>a.fbKey===currentAdmin.fbKey);
      if(refreshed){
        currentAdmin = refreshed;
        applyAdminPermissionVisibility();
      } else {
        showToast('Your admin account was removed');
        logoutAdmin();
      }
    }
    renderAdmins();
  });
  // Settings
  db.ref('appSettings').once('value',snap=>{
    if(snap.val())settings={...settings,...snap.val()};
    renderSheetsSettings();
  });
  // Scanner logs & reports
  const sL=wref('scannerLogs');activeListeners.push(sL);
  sL.on('value',snap=>{
    scannerLogs=[];
    snap.forEach(c=>{scannerLogs.push({fbKey:c.key,...c.val()})});
    if(document.getElementById('tab-scanner').classList.contains('active'))renderScanner();
    updateScannerBadge();
  });
  const rL=wref('reports');activeListeners.push(rL);
  rL.on('value',snap=>{
    const newReports=[];
    snap.forEach(c=>{newReports.push({fbKey:c.key,...c.val()})});
    if(!reportsFirstLoad){
      newReports.forEach(r=>{
        const count = r.messages ? Object.keys(r.messages).length : 0;
        const prevCount = prevReportMsgCounts[r.fbKey]||0;
        if(count>prevCount){
          const newMsgs = Object.values(r.messages).sort((a,b)=>(a.time||'').localeCompare(b.time||'')).slice(prevCount);
          newMsgs.forEach(m=>notifyNewReportMessage(r,m));
        }
      });
    }
    prevReportMsgCounts = {};
    newReports.forEach(r=>{ prevReportMsgCounts[r.fbKey] = r.messages ? Object.keys(r.messages).length : 0; });
    reportsFirstLoad = false;
    reports = newReports;
    updateReportsBadge();
    if(document.getElementById('tab-reports').classList.contains('active') && reportsSubTab==='issues')renderReports();
  });
  // Direct messages between admins and workers
  const mL=wref('messages');activeListeners.push(mL);
  mL.on('value',snap=>{
    const newMessages=[];
    snap.forEach(c=>{newMessages.push({fbKey:c.key,...c.val()})});
    if(!messagesFirstLoad){
      newMessages.forEach(m=>{
        if(!prevMessageKeys.has(m.fbKey)) notifyNewDirectMessage(m);
      });
    }
    prevMessageKeys = new Set(newMessages.map(m=>m.fbKey));
    messagesFirstLoad = false;
    messages = newMessages;
    updateMessagesBadge();
    if(document.getElementById('tab-messages').classList.contains('active'))renderMessages();
  });
  // Batch reports (new batches seen on shelf)
  const bL=wref('batchReports');activeListeners.push(bL);
  bL.on('value',snap=>{
    const newBatch=[];
    snap.forEach(c=>{newBatch.push({fbKey:c.key,...c.val()})});
    if(!batchFirstLoad){
      newBatch.forEach(b=>{ if(!prevBatchKeys.has(b.fbKey) && currentAdmin){ showToast('📦 New batch reported: '+b.sku+' by '+b.workerName); playNotificationSound(); } });
    }
    prevBatchKeys = new Set(newBatch.map(b=>b.fbKey));
    batchFirstLoad = false;
    batchReports = newBatch;
    updateBatchBadge();
    if(document.getElementById('tab-reports').classList.contains('active') && reportsSubTab==='batch')renderBatchTab();
  });
  // Expiry date corrections
  const eL=wref('expiryReports');activeListeners.push(eL);
  eL.on('value',snap=>{
    const newExpiry=[];
    snap.forEach(c=>{newExpiry.push({fbKey:c.key,...c.val()})});
    if(!expiryFirstLoad){
      newExpiry.forEach(x=>{ if(!prevExpiryKeys.has(x.fbKey) && currentAdmin){ showToast('📅 Expiry correction reported: '+x.sku+' by '+x.workerName); playNotificationSound(); } });
    }
    prevExpiryKeys = new Set(newExpiry.map(x=>x.fbKey));
    expiryFirstLoad = false;
    expiryReports = newExpiry;
    updateBatchBadge();
    if(document.getElementById('tab-reports').classList.contains('active') && reportsSubTab==='batch')renderBatchTab();
  });
  // Production entries — orders & SKUs logged by workers throughout the day
  const pL=wref('production');activeListeners.push(pL);
  pL.on('value',snap=>{
    production=[];
    snap.forEach(c=>{production.push({fbKey:c.key,...c.val()})});
    renderCheckin();
    if(!document.getElementById('production-modal').classList.contains('hidden'))renderProductionModal();
    if(document.getElementById('tab-analytics').classList.contains('active'))renderAnalytics();
    if(document.getElementById('tab-outbound').classList.contains('active'))renderOutbound(); else updateOutboundBadge();
    if(!document.getElementById('snapshot-modal').classList.contains('hidden') && (snapshotState.type==='packing'||snapshotState.type==='picking'))openOutboundSnapshot(snapshotState.key);
  });
  // Orders — created by order-assignment admins, assigned to workers to pick
  const oL=wref('orders');activeListeners.push(oL);
  oL.on('value',snap=>{
    orders=[];
    snap.forEach(c=>{orders.push({fbKey:c.key,...c.val()})});
    safeRender('reconcileCompletions',()=>reconcileOrderCompletions());
    safeRender('reconcileTimers',()=>reconcileOrderTimers());
    safeRender('checkin',()=>renderCheckin());
    if(document.getElementById('tab-orders').classList.contains('active'))safeRender('orders',()=>renderOrdersTab());
    if(!document.getElementById('production-modal').classList.contains('hidden'))safeRender('productionModal',()=>renderProductionModal());
    if(!document.getElementById('assign-workers-modal').classList.contains('hidden'))safeRender('assignList',()=>renderAssignWorkersList());
    // Orders today / remaining / picked-not-packed all read straight from
    // this `orders` array — without these, those stat cards would only ever
    // refresh when a production entry happened to also change, going stale
    // any time an order is assigned, picked, or packed with no accompanying
    // production write on this tick.
    if(document.getElementById('tab-analytics').classList.contains('active'))safeRender('analytics',()=>renderAnalytics());
    if(document.getElementById('tab-outbound').classList.contains('active'))safeRender('outbound',()=>renderOutbound()); else safeRender('outboundBadge',()=>updateOutboundBadge());
    if(!document.getElementById('snapshot-modal').classList.contains('hidden') && snapshotState.type==='order')safeRender('snapshotModal',()=>openOutboundSnapshot(snapshotState.key));
  });
  // Customer directory — admin corrections/additions to the CSV-imported
  // customer→market lookup used by the order form's search/autofill.
  const cdL=wref('customerDirectory');activeListeners.push(cdL);
  cdL.on('value',snap=>{
    customerDirectory={};
    snap.forEach(c=>{customerDirectory[decodeFbKey(c.key)]=c.val()});
  });
  // Putaway sessions currently in progress, keyed by worker id — written the
  // moment Start is pressed and removed the moment End is pressed. Persisting
  // this to Firebase (instead of just a JS variable) means a closed tab, a
  // locked phone, or a crash mid-task doesn't lose the start time — reopening
  // the Putaway tab for that worker picks the running timer back up.
  const ppL=wref('putawayInProgress');activeListeners.push(ppL);
  ppL.on('value',snap=>{
    putawayInProgress={};
    snap.forEach(c=>{putawayInProgress[c.key]=c.val()});
    renderCheckin();
    if(!document.getElementById('production-modal').classList.contains('hidden') && pendingProductionType==='putaway') syncPutawayUIFromFirebase();
  });

  setTimeout(()=>{
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('sync-indicator').style.display='flex';
  },1200);
}

function switchWarehouse(wh){
  if(!currentAdmin || currentAdmin.role !== 'Super Admin'){
    showToast('Only Super Admins can switch warehouses');
    document.getElementById('warehouse-selector').value=currentWarehouse;
    return;
  }
  currentWarehouse=wh;
  document.getElementById('warehouse-label').textContent = WAREHOUSE_LOCATIONS[wh]?.label || '🏭 '+wh;
  loadWarehouseData();
  const firstTab=document.querySelector('.tab');
  switchTab('checkin',firstTab);
  showToast('Switched to '+wh);
}

// ---- SAVE HELPERS ----
function saveWorker(w){
  if(w.fbKey){wref('workers/'+w.fbKey).set(stripFbKey(w))}
  else{const ref=wref('workers').push();ref.set(w);w.fbKey=ref.key}
}
// One check-in per worker per day, enforced by the key itself. New check-ins
// are written to a deterministic key (date_workerId) instead of a random push
// key, so a double tap, a slow network retry, or two admins tapping "Check in"
// for the same worker on two devices all land on the same record instead of
// creating a second one that gets approved and paid twice.
function checkinKey(c){return c.date+'_'+c.workerId}
function saveCheckin(c){
  if(c.fbKey){wref('checkins/'+c.fbKey).set(stripFbKey(c));return}
  if(c.workerId==null||!c.date){const ref=wref('checkins').push();ref.set(c);c.fbKey=ref.key;return}
  const key=checkinKey(c);
  c.fbKey=key;
  wref('checkins/'+key).transaction(existing=>existing===null?stripFbKey(c):undefined);
}
// Guards against duplicates already in the database (created before the
// deterministic key, or by two devices racing). Earliest check-in per
// worker+day wins; an approved one always beats a pending one so approvals
// aren't silently undone by a stray later record.
function dedupeCheckins(list){
  const byKey={};
  list.forEach(c=>{
    if(c.workerId==null||!c.date){byKey[c.fbKey]=c;return}
    const k=c.date+'_'+c.workerId;
    const prev=byKey[k];
    if(!prev){byKey[k]=c;return}
    const rank=x=>x.status==='approved'?2:x.status==='pending'?1:0;
    if(rank(c)>rank(prev)||(rank(c)===rank(prev)&&(c.checkinTime||'')<(prev.checkinTime||''))) byKey[k]=c;
  });
  return Object.values(byKey);
}
function saveAdmin(a){
  if(a.fbKey){adminRef(a.fbKey).set(stripFbKey(a))}
  else{const ref=adminRef().push();ref.set(a);a.fbKey=ref.key}
}
function stripFbKey(obj){const o={...obj};delete o.fbKey;return o}
function saveSettings(){db.ref('appSettings').set(settings);localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}

// ---- UTILS ----
// Never let one broken render take the whole live-update loop down with it.
function safeRender(label,fn){
  try{fn()}catch(e){console.error('[render:'+label+']',e)}
}
// Local calendar date, not UTC. toISOString() converts to UTC first, so in
// Lagos (UTC+1) everything between midnight and 01:00 was still being filed
// under the previous day — a worker checking in at 00:20 got yesterday's
// record, then showed as "not checked in" for the real day and could check in
// a second time. Nairobi (UTC+3) had the same gap, three hours wide.
function today(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
// Local YYYY-MM-DD for any Date object. Use this instead of
// d.toISOString().split('T')[0] — toISOString converts to UTC first, which
// shifts the date back by a day for week/month/year boundary math in
// Lagos (UTC+1) and Nairobi (UTC+3).
function toLocalISO(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
// Local calendar day for an ISO timestamp (stored in UTC), so "today" counts
// match the app's local-date filters instead of drifting by a day late at night.
function localDay(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(isNaN(d)) return String(iso).slice(0,10);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayLabel(){return new Date().toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function initials(n){if(!n||typeof n!=='string')return '?';return n.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function getType(w){if(w.gradeOverride&&w.gradeOverride!=='auto')return w.gradeOverride;return Math.floor((new Date()-new Date(w.startDate))/86400000)>=PROBATION_DAYS?'senior':'probation'}
function getPay(w){if((w.homeWarehouse||w.warehouse)==='NAIROBI_DC')return NAIROBI_FLAT_PAY;return getType(w)==='senior'?SENIOR_PAY:PROBATION_PAY}
function gradeOptionLabel(grade,wh){
  if(wh==='NAIROBI_DC')return (grade==='senior'?'Senior':'Probation')+' — KSh '+NAIROBI_FLAT_PAY.toLocaleString()+'/day (flat rate)';
  return grade==='senior'?('Senior — ₦'+SENIOR_PAY.toLocaleString()+'/day'):('Probation — ₦'+PROBATION_PAY.toLocaleString()+'/day');
}
function updateGradeOptions(selectId,whSelectId){
  const sel=document.getElementById(selectId);if(!sel)return;
  const whSel=document.getElementById(whSelectId);
  const wh=whSel?whSel.value:currentWarehouse;
  Array.from(sel.options).forEach(opt=>{
    if(opt.value==='senior'||opt.value==='probation')opt.textContent=gradeOptionLabel(opt.value,wh);
  });
}
function currencySymbol(){return currentWarehouse==='NAIROBI_DC'?'KSh ':'₦'}
function currencyLabel(){return currentWarehouse==='NAIROBI_DC'?'KSh':'NGN'}
function getCheckinState(wId){return checkins.find(c=>c.workerId===wId&&c.date===today())||null}
function formatCheckinTime(iso){if(!iso)return '';return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}
function shiftLabel(shift){return SHIFTS[shift]?SHIFTS[shift].label:''}

// ---- AUTH ----
function showLogin(){document.getElementById('login-modal').classList.remove('hidden')}
function hideLogin(){document.getElementById('login-modal').classList.add('hidden')}
function doLogin(){
  const u=document.getElementById('login-username').value.trim();
  const p=document.getElementById('login-password').value;
  const found=admins.find(a=>a.username===u&&a.password===p);
  if(!found){document.getElementById('login-error').style.display='block';return}
  currentAdmin=found;hideLogin();
  document.getElementById('login-error').style.display='none';
  document.getElementById('login-username').value='';document.getElementById('login-password').value='';
  document.getElementById('login-btn').style.display='none';
  document.getElementById('admin-pill').style.display='flex';
  const isSuperAdmin=found.role==='Super Admin';
  document.getElementById('admin-pill').textContent='⬡ '+found.role+(isSuperAdmin?'':' · '+currentWarehouse)+' ▾';
  // Super admin can switch warehouses; warehouse admin cannot
  // Super admin gets the selector dropdown; warehouse admins see locked display only
  document.getElementById('warehouse-selector').style.display=isSuperAdmin?'block':'none';
  document.getElementById('warehouse-display').style.display=isSuperAdmin?'none':'flex';
  applyAdminPermissionVisibility();
  renderCheckin();showToast('Welcome, '+found.role);
  renderBubbleVisibility();
}
function handleAdminPill(){if(confirm('Log out as admin?'))logoutAdmin()}
function logoutAdmin(){
  currentAdmin=null;
  document.getElementById('login-btn').style.display='flex';
  document.getElementById('admin-pill').style.display='none';
  document.getElementById('warehouse-selector').style.display='none';
  document.getElementById('warehouse-display').style.display='flex';
  document.querySelectorAll('.admin-only').forEach(el=>el.classList.remove('visible'));
  switchTab('checkin',document.querySelector('.tab'));
  renderCheckin();showToast('Logged out');
  renderBubbleVisibility();
}

// ---- CHECK IN ----
function requestCheckin(id){
  if(getCheckinState(id))return;
  const w=workers.find(x=>x.id===id);if(!w)return;
  // Check if worker is allowed at this warehouse
  const allowed=w.allowedWarehouses||[w.homeWarehouse||currentWarehouse];
  if(!allowed.includes(currentWarehouse)){
    showToast('⛔ '+w.name+' is not assigned to '+currentWarehouse);return;
  }
  pendingCheckinWorkerId=id;
  if(currentWarehouse==='LAGOS_DC'){
    showShiftModal();
    return;
  }
  showDeviceModal();
}
function showShiftModal(){document.getElementById('shift-modal').classList.remove('hidden')}
function hideShiftModal(){document.getElementById('shift-modal').classList.add('hidden')}
function selectShift(shift){
  pendingCheckinShift=shift;
  hideShiftModal();
  showDeviceModal();
}
function showDeviceModal(){
  const grid = document.getElementById('device-scanner-grid');
  if(grid){
    const available = getAvailableScanners();
    grid.innerHTML = available.length ? available.map(n=>`<button class="btn" onclick="selectDevice(${n})" style="justify-content:center;padding:12px"><i class="ti ti-barcode"></i> Scanner ${n}</button>`).join('') : '<div style="grid-column:1/-1;font-size:12px;color:var(--text2);text-align:center;padding:6px">No scanners currently available</div>';
  }
  document.getElementById('device-modal').classList.remove('hidden');
}
function hideDeviceModal(){document.getElementById('device-modal').classList.add('hidden')}
function selectDevice(device){
  pendingCheckinDevice=device;
  hideDeviceModal();
  proceedCheckin(pendingCheckinWorkerId);
}
function proceedCheckin(id){
  const w=workers.find(x=>x.id===id);if(!w)return;
  const bankFeatureActive=today()>=BANK_DETAILS_START_DATE;
  if(bankFeatureActive&&(!w.bankAccountNumber||!w.bankName||!w.warehouse)){
    pendingCheckinWorkerId=id;showBankModal();return;
  }
  doCheckin(id);
}
function doCheckin(id){
  const w=workers.find(x=>x.id===id);if(!w)return;
  // Re-check right before writing. The guard in requestCheckin() runs before
  // the shift/device modals, so anything that happened during those taps (a
  // second tap, another device checking the same worker in) was invisible to
  // it and produced a duplicate record.
  if(getCheckinState(id)){showToast(w.name+' is already checked in today');return}
  if(checkinInFlight[id]){return}
  checkinInFlight[id]=true;
  setTimeout(()=>{delete checkinInFlight[id]},4000);
  const pay=getPay(w),type=getType(w);
  const c={id:Date.now(),workerId:id,workerName:w.name,date:today(),pay,type,status:'pending'};
  c.checkinTime=new Date().toISOString();
  if(currentWarehouse==='LAGOS_DC'){
    c.shift=pendingCheckinShift||'morning';
  }
  if(pendingCheckinDevice){
    c.scannerNum = pendingCheckinDevice==='mobile' ? null : pendingCheckinDevice;
    c.isMobile = pendingCheckinDevice==='mobile';
  }
  assignDeviceForCheckin(w.name, pendingCheckinDevice);
  pendingCheckinShift=null;
  pendingCheckinDevice=null;
  saveCheckin(c);
  showToast(w.name+' — check-in submitted, awaiting approval');
}
function showBankModal(){document.getElementById('bank-modal').classList.remove('hidden')}
function hideBankModal(){
  document.getElementById('bank-modal').classList.add('hidden');
  ['bank-account-number','bank-name','bank-warehouse'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('bank-error').style.display='none';
}
function submitBankDetails(){
  const acc=document.getElementById('bank-account-number').value.trim();
  const bank=document.getElementById('bank-name').value.trim();
  const wh=document.getElementById('bank-warehouse').value.trim();
  if(!acc||!bank||!wh){document.getElementById('bank-error').style.display='block';return}
  const w=workers.find(x=>x.id===pendingCheckinWorkerId);if(!w){hideBankModal();return}
  const alreadyHad=!!(w.bankAccountNumber&&w.bankName&&w.warehouse);
  w.bankAccountNumber=acc;w.bankName=bank;w.warehouse=wh;
  saveWorker(w);hideBankModal();
  if(!alreadyHad&&!getCheckinState(pendingCheckinWorkerId))doCheckin(pendingCheckinWorkerId);
  else{renderManage();showToast('Bank details updated for '+w.name);}
  pendingCheckinWorkerId=null;
}

// ---- RENDER CHECK IN ----
function renderCheckin(){
  populateReturnCard('checkin-return');
  const q=(document.getElementById('search-input')||{value:''}).value.toLowerCase();
  const t=today();
  const list=document.getElementById('worker-list');if(!list)return;
  if(!workers.length){list.innerHTML='<div class="empty-state"><i class="ti ti-users"></i>No workers added yet. Ask an admin to add workers.</div>';return}
  const filtered=workers.filter(w=>w.name.toLowerCase().includes(q));
  if(!filtered.length){list.innerHTML='<div class="empty-state"><i class="ti ti-search"></i>No worker found</div>';return}
  list.innerHTML=filtered.map(w=>{
    const type=getType(w),pay=getPay(w);
    const ci=getCheckinState(w.id);
    const start=new Date(w.startDate);
    const daysLeft=Math.max(0,PROBATION_DAYS-Math.floor((new Date()-start)/86400000));
    const meta=type==='probation'?'Probation · '+daysLeft+' days left · '+currencySymbol()+pay.toLocaleString()+'/day':'Senior · '+currencySymbol()+pay.toLocaleString()+'/day';
    let btn='',badge='',shiftInfo='',prodInfo='',logBtn='';
    // Assigned-order visibility does NOT depend on today's check-in — an admin
    // can assign an order to a worker before they've tapped "Check in" (first
    // thing in the morning, or a carried-over order from a previous day), and
    // the worker still needs a way to see and work it. Previously this whole
    // block — and the "Log work" button that's the only way into it — lived
    // inside `if(ci)`, so any worker who hadn't checked in yet today simply
    // had no way to see orders assigned to them at all. Computed unconditionally
    // now so it shows regardless of check-in state.
    const assignedOrders=orders.filter(o=>{
      if(o.status!=='assigned')return false;
      const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(w.id));
      return mine&&!mine.done;
    });
    if(assignedOrders.length){
      // Same one-at-a-time picture as the modal: show the real work timer
      // for whichever order is actually running (mine.startedAt), not just
      // "time since assigned" for every order in the queue.
      const activeOrder = assignedOrders.find(o=>{
        const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(w.id));
        return mine&&mine.startedAt;
      });
      const queuedCount = assignedOrders.length - (activeOrder?1:0);
      if(activeOrder){
        const mine=getOrderAssignees(activeOrder).find(a=>String(a.workerId)===String(w.id));
        prodInfo+='<div class="worker-meta" style="color:var(--amber-text)">⏱ '+activeOrder.customer+' ('+activeOrder.market+')'+(getOrderAssignees(activeOrder).length>1?' · team of '+getOrderAssignees(activeOrder).length:'')+' · <span class="order-timer" data-assigned-at="'+mine.startedAt+'">0m</span>'+(queuedCount?' · +'+queuedCount+' queued':'')+'</div>';
      } else {
        prodInfo+='<div class="worker-meta" style="color:var(--amber-text)">⏱ '+assignedOrders.length+' order'+(assignedOrders.length>1?'s':'')+' queued to pick — starting…</div>';
      }
    }
    if(ci){
      const dev=deviceLabel(ci);
      if(ci.shift){
        shiftInfo='<div class="worker-meta">'+shiftLabel(ci.shift)+' · Checked in '+formatCheckinTime(ci.checkinTime)+(dev?' · '+dev:'')+'</div>';
      } else if(ci.checkinTime){
        shiftInfo='<div class="worker-meta">Checked in '+formatCheckinTime(ci.checkinTime)+(dev?' · '+dev:'')+'</div>';
      } else if(dev){
        shiftInfo='<div class="worker-meta">'+dev+'</div>';
      }
      const prodEntries=production.filter(p=>p.workerId===w.id&&p.date===t);
      if(prodEntries.length){
        const byType={picking:{orders:0,skus:0},packing:{orders:0,skus:0},replenishment:{qty:0},putaway:{qty:0}};
        let lastPackTime='';
        prodEntries.forEach(p=>{
          const tt=getTaskType(p);
          if(tt==='picking'||tt==='packing'){ byType[tt].orders+=p.orders||0; byType[tt].skus+=p.skus||0; if(tt==='packing'&&p.time>lastPackTime)lastPackTime=p.time; }
          else if(byType[tt]) byType[tt].qty+=p.qty||0;
        });
        const parts=[];
        if(byType.picking.orders||byType.picking.skus) parts.push('🧺 '+byType.picking.orders.toLocaleString()+' orders picked ('+byType.picking.skus.toLocaleString()+' SKUs)');
        if(byType.packing.orders||byType.packing.skus) parts.push('📦 '+byType.packing.orders.toLocaleString()+' orders packed ('+byType.packing.skus.toLocaleString()+' SKUs) · ready for dispatch '+lastPackTime);
        if(byType.replenishment.qty) parts.push('🔄 '+byType.replenishment.qty.toLocaleString()+' units replenished');
        if(byType.putaway.qty) parts.push('📥 '+byType.putaway.qty.toLocaleString()+' units put away');
        if(parts.length) prodInfo+='<div class="worker-meta">'+parts.join(' · ')+' <span style="color:var(--text3)">· today</span></div>';
      }
      const putawaySession=putawayInProgress[w.id];
      if(putawaySession){
        prodInfo+='<div class="worker-meta" style="color:var(--amber-text)">⏱ Putaway: '+putawaySession.supplier+' · <span class="order-timer" data-assigned-at="'+putawaySession.startedAt+'">0m</span></div>';
      }
      if(ci.isMobile&&ci.status!=='rejected'){
        logBtn+='<button class="btn" onclick="openPickupScannerModal('+w.id+')" title="Pick up a scanner instead of your phone"><i class="ti ti-barcode"></i></button>';
      }
    }
    // "Log work" is available whenever the worker is checked in OR has an
    // order waiting for them — the latter case is exactly the fix above: it
    // gives a not-yet-checked-in worker an actual way to reach their order,
    // instead of only ever seeing a "Check in" button.
    if(ci || assignedOrders.length){
      logBtn='<button class="btn" onclick="openProductionModal('+w.id+')" title="Log picking, packing, replenishment or putaway"><i class="ti ti-package"></i></button>'+logBtn;
    }
    if(!ci){btn='<button class="btn" onclick="requestCheckin('+w.id+')"><i class="ti ti-login"></i> Check in</button>';badge='<span class="badge '+type+'">'+(type==='probation'?'Probation':'Senior')+'</span>';}
    else if(ci.status==='pending'){btn='<button class="btn pending-btn"><i class="ti ti-clock"></i> Pending</button>';badge='<span class="badge pending">Pending</span>';}
    else if(ci.status==='approved'){btn='<button class="btn done"><i class="ti ti-check"></i> Approved</button>'+(currentAdmin?'<button class="btn danger" onclick="unapproveCI(\''+ci.fbKey+'\')" title="Move back to pending"><i class="ti ti-arrow-back-up"></i></button>':'');badge='<span class="badge approved">Present</span>';}
    else{btn='<button class="btn danger" style="cursor:default"><i class="ti ti-x"></i> Rejected</button>';badge='<span class="badge" style="background:var(--red-bg);color:var(--red-text);border:0.5px solid var(--red-border)">Rejected</span>';}
    return '<div class="worker-card"><div class="worker-left"><div class="avatar '+type+'">'+initials(w.name)+'</div><div><div class="worker-name">'+w.name+'</div><div class="worker-meta">'+meta+'</div>'+shiftInfo+prodInfo+'</div></div><div class="worker-right">'+badge+logBtn+btn+'</div></div>';
  }).join('');
}

// ---- ORDERS (order assignment to workers for picking) ----
function addOrderRow(){
  if(!adminHasPerm('orders')){showToast('You do not have access to Orders');return}
  const customer=document.getElementById('order-customer-input').value.trim();
  const market=document.getElementById('order-market-input').value.trim();
  if(!customer||!market){showToast('Enter customer name and market');return}
  const o={customer,market,status:'unassigned',date:today(),createdAt:new Date().toISOString(),createdBy:currentAdmin?.role||'Admin'};
  wref('orders').push(o);
  // Whatever market ends up on the order — whether it came from the CSV
  // import, was corrected by hand, or is for a brand-new customer — becomes
  // the customer's saved market, so the next search/select for this name
  // autofills correctly instead of repeating a stale or missing guess.
  saveCustomerMarketIfChanged(customer, market);
  document.getElementById('order-customer-input').value='';
  document.getElementById('order-market-input').value='';
  closeCustomerSuggestions();
  showToast('Order added — assign it to a worker');
}
function removeOrderRow(fbKey){
  if(!adminHasPerm('orders')){showToast('You do not have access to Orders');return}
  if(!confirm('Remove this order?'))return;
  wref('orders/'+fbKey).remove();
}
// Returns this order's assignees as a normalized array of
// {workerId, workerName, assignedAt, done, doneAt, qty} — whether the order
// uses the new multi-worker "assignees" map or still has the old single
// assignedWorkerId/assignedWorkerName/assignedAt fields from before multi-assign
// existed. Lets old orders keep rendering correctly with no migration needed.
function getOrderAssignees(o){
  if(o&&o.assignees) return Object.values(o.assignees).sort((a,b)=>(a.assignedAt||'').localeCompare(b.assignedAt||''));
  if(o&&o.assignedWorkerId) return [{workerId:o.assignedWorkerId,workerName:o.assignedWorkerName,assignedAt:o.assignedAt,startedAt:o.startedAt||null,done:o.status==='picked'||o.status==='packed',doneAt:o.pickedAt||null,qty:o.qtyPicked!=null?o.qtyPicked:null}];
  return [];
}
function assigneesAllDone(map){
  const vals=Object.values(map);
  return vals.length>0 && vals.every(a=>a.done);
}
function sumAssigneesQty(map){
  return Object.values(map).reduce((s,a)=>s+(a.qty||0),0);
}
// Self-heal pass: if two teammates finish within the same round-trip, each
// client's completion write only touches its own assignees/<id> subpath (see
// markOrderPicked), so neither one clobbers the other — but it also means
// neither client may have seen BOTH completions in time to flip the order's
// own status to 'picked'. This runs on every orders snapshot and closes that
// gap: any 'assigned' order whose assignees are now all done gets finalized.
function reconcileOrderCompletions(){
  orders.forEach(o=>{
    if(o.status!=='assigned')return;
    const assignees=getOrderAssignees(o);
    if(!assignees.length)return;
    const map={};assignees.forEach(a=>{map[a.workerId]=a});
    if(assigneesAllDone(map)){
      wref('orders/'+o.fbKey).update({
        status:'picked',
        qtyPicked:sumAssigneesQty(map),
        pickedAt:assignees.map(a=>a.doneAt).filter(Boolean).sort().slice(-1)[0]||new Date().toISOString()
      });
    }
  });
}
function openAssignWorkersModal(fbKey){
  if(!adminHasPerm('orders')){showToast('You do not have access to Orders');return}
  const o=orders.find(x=>x.fbKey===fbKey);if(!o)return;
  if(o.status==='picked'||o.status==='packed'){showToast('This order is already picked');return}
  pendingAssignOrderFbKey=fbKey;
  const search=document.getElementById('assign-workers-search');if(search)search.value='';
  const label=document.getElementById('assign-workers-order-label');if(label)label.textContent=o.customer+' · '+o.market;
  renderAssignWorkersList();
  document.getElementById('assign-workers-modal').classList.remove('hidden');
}
function closeAssignWorkersModal(){
  document.getElementById('assign-workers-modal').classList.add('hidden');
  pendingAssignOrderFbKey=null;
  renderOrdersTab();
}
function renderAssignWorkersList(){
  const wrap=document.getElementById('assign-workers-list');if(!wrap)return;
  const o=orders.find(x=>x.fbKey===pendingAssignOrderFbKey);
  if(!o){wrap.innerHTML='';return}
  const q=(document.getElementById('assign-workers-search')?.value||'').trim().toLowerCase();
  const assignees=getOrderAssignees(o);
  const assignedIds=new Set(assignees.map(a=>String(a.workerId)));
  const activeIds=new Set(workers.filter(w=>{const c=getCheckinState(w.id);return c&&c.status==='approved'}).map(w=>w.id));
  const list=workers.filter(w=>!q||w.name.toLowerCase().includes(q)).slice().sort((a,b)=>{
    const aAssigned=assignedIds.has(String(a.id)),bAssigned=assignedIds.has(String(b.id));
    if(aAssigned!==bAssigned)return aAssigned?-1:1;
    return a.name.localeCompare(b.name);
  });
  if(!list.length){wrap.innerHTML='<p style="text-align:center;color:var(--text3);padding:12px;font-size:13px">No workers match "'+escHtml(q)+'"</p>';return}
  wrap.innerHTML=list.map(w=>{
    const a=assignees.find(x=>String(x.workerId)===String(w.id));
    const isDone=!!(a&&a.done);
    const checked=assignedIds.has(String(w.id));
    const notCheckedIn=!activeIds.has(w.id);
    return '<label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:0.5px solid var(--border2);border-radius:var(--radius);'+(isDone?'opacity:0.65':'cursor:pointer')+'">'+
      '<input type="checkbox" style="width:auto" '+(checked?'checked':'')+' '+(isDone?'disabled':'')+' onchange="toggleAssignWorker(\''+w.id+'\',this.checked)">'+
      '<span style="flex:1;font-size:14px">'+escHtml(w.name)+(notCheckedIn?' <span style="color:var(--text3);font-size:12px">(not checked in)</span>':'')+'</span>'+
      (isDone?'<span class="badge approved" style="font-size:11px">Done</span>':'')+
      '</label>';
  }).join('');
}
function toggleAssignWorker(workerIdStr,checked){
  if(!adminHasPerm('orders')){showToast('You do not have access to Orders');renderAssignWorkersList();return}
  const o=orders.find(x=>x.fbKey===pendingAssignOrderFbKey);if(!o)return;
  const w=workers.find(x=>String(x.id)===String(workerIdStr));if(!w)return;
  const assignees=getOrderAssignees(o);
  const map={};assignees.forEach(a=>{map[a.workerId]=a});
  // If this order has never been through the multi-assign flow before (still
  // on the old single-assignee fields), the first edit here has to persist
  // the WHOLE map in one write — otherwise clearing the legacy fields below
  // would silently drop whoever was already assigned. Once assignees exists
  // in Firebase, later edits only touch the one worker's own subpath so a
  // teammate marking their part done at the same moment can't be clobbered.
  const needsMigration=!o.assignees;
  if(checked){
    if(!map[w.id])map[w.id]={workerId:w.id,workerName:w.name,assignedAt:new Date().toISOString(),done:false,doneAt:null,qty:null};
  } else {
    if(map[w.id]&&!map[w.id].done)delete map[w.id];
  }
  const remaining=Object.values(map);
  const allDone=assigneesAllDone(map);
  const update={assignedWorkerId:null,assignedWorkerName:null};
  if(needsMigration){
    update.assignees=map;
  } else if(checked){
    update['assignees/'+w.id]=map[w.id];
  } else {
    update['assignees/'+w.id]=null;
  }
  if(!remaining.length){
    update.status='unassigned';
    update.assignedAt=null;
  } else if(allDone){
    // Everyone left assigned had already finished their part before this
    // toggle (e.g. the last still-picking teammate just got unassigned) —
    // close the order out now instead of leaving it stuck on "In progress".
    update.status='picked';
    update.qtyPicked=sumAssigneesQty(map);
    update.pickedAt=new Date().toISOString();
    update.assignedAt=remaining.map(a=>a.assignedAt).sort()[0];
  } else {
    update.status='assigned';
    update.assignedAt=remaining.map(a=>a.assignedAt).sort()[0];
  }
  wref('orders/'+o.fbKey).update(update);
  showToast(checked?w.name+' added to '+o.customer:w.name+' removed from '+o.customer);
  renderAssignWorkersList();
}
function elapsedLabel(iso){
  if(!iso)return '';
  const ms=Date.now()-new Date(iso).getTime();
  const mins=Math.max(0,Math.floor(ms/60000));
  if(mins<60) return mins+'m';
  return Math.floor(mins/60)+'h '+(mins%60)+'m';
}
// Frozen duration between two fixed timestamps (e.g. assigned → picked) — unlike
// elapsedLabel, this does NOT keep counting up against "now" once the task is done.
function durationLabel(startIso,endIso){
  if(!startIso||!endIso)return '—';
  const ms=new Date(endIso).getTime()-new Date(startIso).getTime();
  const mins=Math.max(0,Math.floor(ms/60000));
  if(mins<60) return mins+'m';
  return Math.floor(mins/60)+'h '+(mins%60)+'m';
}
function renderOrdersTimers(){
  document.querySelectorAll('.order-timer').forEach(el=>{
    el.textContent=elapsedLabel(el.dataset.assignedAt);
  });
}
function renderOrdersTab(){
  const body=document.getElementById('orders-body');if(!body)return;
  const t=today();
  const todays=orders.filter(o=>o.date===t).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  const badge=document.getElementById('orders-count-badge');
  const openCount=todays.filter(o=>o.status==='unassigned'||o.status==='assigned').length;
  if(badge){badge.style.display=openCount>0?'inline':'none';badge.textContent=openCount;}
  if(!todays.length){body.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:20px">No orders added today yet</td></tr>';renderReadyToPackOrders();renderPendingOrders();return}
  body.innerHTML=todays.map(o=>{
    const statusBadge=o.status==='packed'?'<span class="badge approved">Packed</span>'
      :o.status==='picked'?'<span class="badge approved">Picked</span>'
      :o.status==='assigned'?'<span class="badge pending">In progress</span>'
      :'<span class="badge">Unassigned</span>';
    const isDone=o.status==='picked'||o.status==='packed';
    const timer=o.status==='assigned'?'<span class="order-timer" data-assigned-at="'+o.assignedAt+'">'+elapsedLabel(o.assignedAt)+'</span>'
      :isDone?durationLabel(o.assignedAt,o.pickedAt)+' total'
      :'—';
    return '<tr>'+
      '<td>'+o.customer+'</td>'+
      '<td>'+o.market+'</td>'+
      '<td>'+assignCellHtml(o,isDone)+'</td>'+
      '<td>'+statusBadge+'</td>'+
      '<td style="text-align:right">'+timer+'</td>'+
      '<td style="text-align:right">'+(o.qtyPicked!=null?o.qtyPicked:'—')+'</td>'+
      '<td><button class="btn danger" onclick="removeOrderRow(\''+o.fbKey+'\')"><i class="ti ti-trash"></i></button></td>'+
      '</tr>';
  }).join('');
  renderReadyToPackOrders();
  renderPendingOrders();
}
// Every picked order still waiting to be packed — any date, not just today,
// since an order picked yesterday and still unpacked is exactly the kind of
// thing this list needs to surface, not hide once the calendar rolls over.
// This is the same status the "Pick order to pack" search list inside the
// worker's Log Work modal draws from, just as a standalone admin-facing view.
function orderStatus(o){return (o&&o.status)||'unassigned'}
function getReadyToPackOrders(){
  return orders.filter(o=>orderStatus(o)==='picked').sort((a,b)=>(a.pickedAt||'').localeCompare(b.pickedAt||''));
}
function renderReadyToPackOrders(){
  const body = document.getElementById('ready-to-pack-body');
  if(!body) return;
  const ready = getReadyToPackOrders();
  const badge = document.getElementById('ready-to-pack-count-badge');
  if(badge){ badge.style.display = ready.length ? 'inline' : 'none'; badge.textContent = ready.length; }
  if(!ready.length){ body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="ti ti-circle-check"></i>Nothing waiting — everything picked has been packed</div></td></tr>'; return; }
  body.innerHTML = ready.map(o=>{
    const pickedBy = getOrderAssignees(o).map(a=>escHtml(a.workerName)).join(', ') || '—';
    return '<tr>'+
      '<td>'+escHtml(o.customer)+'</td>'+
      '<td>'+escHtml(o.market)+'</td>'+
      '<td>'+pickedBy+'</td>'+
      '<td style="text-align:right">'+(o.qtyPicked!=null?o.qtyPicked:'—')+'</td>'+
      '<td style="text-align:right">'+elapsedLabel(o.pickedAt)+'</td>'+
      '<td><button class="btn danger" onclick="removeOrderRow(\''+o.fbKey+'\')"><i class="ti ti-trash"></i></button></td>'+
      '</tr>';
  }).join('');
}
// Shared "Assign to" cell for both the today's-orders and pending-orders
// tables — shows who's on the order (with a ✓ once their part is done) and,
// while the order's still open, a button into the searchable assign modal.
function assignCellHtml(o,isDone){
  const assignees=getOrderAssignees(o);
  const doneCount=assignees.filter(a=>a.done).length;
  const chips=assignees.length
    ? assignees.map(a=>'<span class="badge'+(a.done?' approved':'')+'" style="font-size:11px">'+escHtml(a.workerName)+(a.done?' ✓':'')+'</span>').join(' ')
    : '<span style="color:var(--text3);font-size:12.5px">No one assigned</span>';
  const progress=(assignees.length>1&&!isDone)?'<div style="font-size:11px;color:var(--text3)">'+doneCount+'/'+assignees.length+' done</div>':'';
  const btn=isDone?'':'<button class="btn" style="align-self:flex-start;padding:3px 9px;font-size:12px" onclick="openAssignWorkersModal(\''+o.fbKey+'\')"><i class="ti ti-users-plus"></i> '+(assignees.length?'Edit':'Assign')+'</button>';
  return '<div style="display:flex;flex-direction:column;gap:4px;min-width:150px">'+
    '<div style="display:flex;flex-wrap:wrap;gap:4px">'+chips+'</div>'+progress+btn+'</div>';
}
// Every order that hasn't been picked yet — still unassigned or stuck
// mid-pick — across ALL dates, not just carried over from previous days.
// Today's own unassigned/in-progress orders also show in "Today's orders"
// above (that table is the full audit log for today, including finished
// ones); this table is specifically the action list of what's not moving
// yet, regardless of when it was added. Deliberately excludes 'picked'
// orders: those are covered by "Ready to pack" instead, so listing them
// here too would show the same order twice on this same tab.
function getPendingOrders(){
  // orderStatus() defaults a missing status to 'unassigned' — rows written
  // before the status field existed were falling out of every count. The sort
  // tolerates a missing date instead of throwing and killing the whole render.
  return orders.filter(o=>orderStatus(o)==='unassigned'||orderStatus(o)==='assigned').sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
function renderPendingOrders(){
  const body = document.getElementById('pending-orders-body');
  if(!body) return;
  const pending = getPendingOrders();
  const badge = document.getElementById('pending-orders-count-badge');
  if(badge){ badge.style.display = pending.length ? 'inline' : 'none'; badge.textContent = pending.length; }
  if(!pending.length){ body.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="ti ti-circle-check"></i>No pending orders — everything has been picked or is in progress</div></td></tr>'; return; }
  body.innerHTML = pending.map(o=>{
    const statusBadge=o.status==='picked'?'<span class="badge approved">Picked</span>'
      :o.status==='assigned'?'<span class="badge pending">In progress</span>'
      :'<span class="badge">Unassigned</span>';
    const isDone=o.status==='picked';
    return '<tr>'+
      '<td>'+o.customer+'</td>'+
      '<td>'+o.market+'</td>'+
      '<td>'+o.date+'</td>'+
      '<td>'+assignCellHtml(o,isDone)+'</td>'+
      '<td>'+statusBadge+'</td>'+
      '<td><button class="btn danger" onclick="removeOrderRow(\''+o.fbKey+'\')"><i class="ti ti-trash"></i></button></td>'+
      '</tr>';
  }).join('');
}

// ---- APPROVALS ----
function updatePendingBadge(){
  const n=checkins.filter(c=>c.status==='pending').length;
  const b=document.getElementById('pending-count-badge');
  if(b){b.style.display=n>0?'inline':'none';b.textContent=n;}
}
function approveCI(fbKey){
  const c=checkins.find(x=>x.fbKey===fbKey);if(!c)return;
  c.status='approved';wref('checkins/'+fbKey+'/status').set('approved');
  showToast(c.workerName+' approved');
}
function rejectCI(fbKey){
  const c=checkins.find(x=>x.fbKey===fbKey);if(!c)return;
  c.status='rejected';wref('checkins/'+fbKey+'/status').set('rejected');
  showToast(c.workerName+' rejected');
}
function unapproveCI(fbKey){
  const c=checkins.find(x=>x.fbKey===fbKey);if(!c)return;
  if(!confirm('Move '+c.workerName+'\'s check-in back to Pending? This will undo the approval (and remove it from the ledger/payroll until re-approved).'))return;
  c.status='pending';wref('checkins/'+fbKey+'/status').set('pending');
  showToast(c.workerName+' moved back to pending');
  renderCheckin();
  if(document.getElementById('tab-approve').classList.contains('active'))renderApprovals();
}
function setApproveFilter(f){
  approveFilter=f;
  ['today','week','all','approved'].forEach(k=>{
    const el=document.getElementById('approve-filter-'+k);
    if(el){el.style.background=f===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=f===k?'600':'500';}
  });
  renderApprovals();
}
function getApproveFilteredPending(){
  const all=checkins.filter(c=>c.status==='pending');
  if(approveFilter==='today')return all.filter(c=>c.date===today());
  if(approveFilter==='week'){
    const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
    const from=toLocalISO(mon);
    return all.filter(c=>c.date>=from&&c.date<=today());
  }
  return all;
}
function getApproveFilteredApproved(){
  const all=checkins.filter(c=>c.status==='approved').sort((a,b)=>b.date.localeCompare(a.date)||(b.checkinTime||'').localeCompare(a.checkinTime||''));
  return all;
}
function approveAll(){
  const pending=getApproveFilteredPending();
  if(!pending.length){showToast('No pending check-ins to approve');return}
  const updates={};
  pending.forEach(c=>{c.status='approved';updates['checkins/'+c.fbKey+'/status']='approved';});
  db.ref().update(updates);
  showToast('✓ '+pending.length+' check-in'+(pending.length>1?'s':'')+' approved');
}
function renderApprovals(){
  const isApprovedView = approveFilter==='approved';
  const list=document.getElementById('approve-list');
  const approveAllBtn=document.getElementById('approve-all-btn');
  if(approveAllBtn) approveAllBtn.style.display = isApprovedView ? 'none' : 'flex';
  const todayP=checkins.filter(c=>c.date===today()&&c.status==='pending').length;
  const todayA=checkins.filter(c=>c.date===today()&&c.status==='approved').length;
  const totalP=checkins.filter(c=>c.status==='pending').length;
  const el=document.getElementById('approve-stats');
  if(el)el.innerHTML='<div class="stat-card"><div class="stat-label">Pending today</div><div class="stat-value">'+todayP+'</div></div><div class="stat-card"><div class="stat-label">Approved today</div><div class="stat-value">'+todayA+'</div></div><div class="stat-card"><div class="stat-label">All pending</div><div class="stat-value">'+totalP+'</div></div>';
  const st=document.getElementById('approve-section-title');
  if(!list)return;
  if(isApprovedView){
    const approved=getApproveFilteredApproved();
    if(st)st.textContent='Approved check-ins — click Unapprove to send one back to Pending';
    if(!approved.length){list.innerHTML='<div class="empty-state"><i class="ti ti-circle-check"></i>No approved check-ins yet</div>';return}
    list.innerHTML=approved.map(c=>{
      const dev=deviceLabel(c);
      const shiftPart=(c.shift?(' · '+shiftLabel(c.shift)+' · Checked in '+formatCheckinTime(c.checkinTime)):(c.checkinTime?(' · Checked in '+formatCheckinTime(c.checkinTime)):''))+(dev?' · '+dev:'');
      return '<div class="worker-card"><div class="worker-left"><div class="avatar '+c.type+'">'+initials(c.workerName)+'</div><div><div class="worker-name">'+escHtml(c.workerName)+'</div><div class="worker-meta">'+c.date+' · '+currencySymbol()+(c.pay||0).toLocaleString()+' · '+(c.type==='probation'?'Probation':'Senior')+shiftPart+'</div></div></div><div class="worker-right"><span class="badge approved">Approved</span><button class="btn danger" onclick="unapproveCI(\''+c.fbKey+'\')"><i class="ti ti-arrow-back-up"></i> Unapprove</button></div></div>';
    }).join('');
    return;
  }
  const pending=getApproveFilteredPending().sort((a,b)=>b.date.localeCompare(a.date));
  const filterLabel={today:'today',week:'this week',all:'all time'};
  if(st)st.textContent='Pending ('+filterLabel[approveFilter]+') — approve all or reject individually';
  if(!pending.length){list.innerHTML='<div class="empty-state"><i class="ti ti-circle-check"></i>No pending check-ins for this period</div>';return}
  list.innerHTML=pending.map(c=>{
    const dev=deviceLabel(c);
    const shiftPart=(c.shift?(' · '+shiftLabel(c.shift)+' · Checked in '+formatCheckinTime(c.checkinTime)):(c.checkinTime?(' · Checked in '+formatCheckinTime(c.checkinTime)):''))+(dev?' · '+dev:'');
    return '<div class="worker-card"><div class="worker-left"><div class="avatar '+c.type+'">'+initials(c.workerName)+'</div><div><div class="worker-name">'+escHtml(c.workerName)+'</div><div class="worker-meta">'+c.date+' · '+currencySymbol()+(c.pay||0).toLocaleString()+' · '+(c.type==='probation'?'Probation':'Senior')+shiftPart+'</div></div></div><div class="worker-right"><button class="btn success" onclick="approveCI(\''+c.fbKey+'\')"><i class="ti ti-check"></i> Approve</button><button class="btn danger" onclick="rejectCI(\''+c.fbKey+'\')"><i class="ti ti-x"></i> Reject</button></div></div>';
  }).join('');
  ['today','week','all','approved'].forEach(k=>{const el=document.getElementById('approve-filter-'+k);if(el){el.style.background=approveFilter===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=approveFilter===k?'600':'500';}});
}

// ---- LEDGER ----
function setLedgerView(v){
  ledgerView=v;
  ['summary','daily'].forEach(k=>{const el=document.getElementById('view-'+k+'-btn');if(el){el.style.background=v===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=v===k?'600':'500';}});
  renderLedger();
}
function getFilteredApproved(){
  const from=(document.getElementById('filter-from')||{value:''}).value;
  const to=(document.getElementById('filter-to')||{value:''}).value;
  let data=checkins.filter(c=>c.status==='approved');
  if(from)data=data.filter(c=>c.date>=from);
  if(to)data=data.filter(c=>c.date<=to);
  return data;
}
function renderLedger(){
  const approved=getFilteredApproved();
  const total=approved.reduce((s,c)=>s+c.pay,0);
  const days=new Set(approved.map(c=>c.date)).size;
  const wCount=new Set(approved.map(c=>c.workerId||c.workerName)).size;
  const el=document.getElementById('ledger-stats');
  if(el)el.innerHTML='<div class="stat-card"><div class="stat-label">Workers paid</div><div class="stat-value">'+wCount+'</div></div><div class="stat-card"><div class="stat-label">Total pay ('+currencyLabel()+')</div><div class="stat-value">'+total.toLocaleString()+'</div></div><div class="stat-card"><div class="stat-label">Days covered</div><div class="stat-value">'+days+'</div></div>';
  if(ledgerView==='summary')renderLedgerSummary(approved,total);
  else renderLedgerDaily(approved,total);
}
function renderLedgerSummary(approved,total){
  const hd=document.getElementById('ledger-head');
  if(hd)hd.innerHTML='<tr><th>Worker</th><th>Grade</th><th style="text-align:center">Days</th><th style="text-align:right">Total pay ('+currencyLabel()+')</th></tr>';
  const tbody=document.getElementById('ledger-body');if(!tbody)return;
  if(!approved.length){tbody.innerHTML='<tr><td colspan="4"><div class="empty-state"><i class="ti ti-calendar-off"></i>No approved records in this range</div></td></tr>';return}
  const byWorker={};
  approved.forEach(c=>{const key=c.workerId||c.workerName;if(!byWorker[key])byWorker[key]={name:c.workerName,type:c.type,days:0,pay:0};byWorker[key].days++;byWorker[key].pay+=c.pay;});
  const rows=Object.values(byWorker).sort((a,b)=>b.pay-a.pay);
  tbody.innerHTML=rows.map(w=>'<tr><td>'+w.name+'</td><td><span class="badge '+w.type+'">'+(w.type==='probation'?'Probation':'Senior')+'</span></td><td style="text-align:center">'+w.days+'</td><td class="pay-cell">'+currencySymbol()+w.pay.toLocaleString()+'</td></tr>').join('')+'<tr style="background:var(--bg2)"><td colspan="3" style="font-weight:600;padding:12px 14px">Total</td><td class="pay-cell">'+currencySymbol()+total.toLocaleString()+'</td></tr>';
}
function renderLedgerDaily(approved,total){
  const hd=document.getElementById('ledger-head');
  const showShiftCol=currentWarehouse==='LAGOS_DC';
  if(hd)hd.innerHTML='<tr><th>Worker</th><th>Date</th><th>Grade</th>'+(showShiftCol?'<th>Shift</th>':'')+'<th>Checked in</th><th style="text-align:right">Pay ('+currencyLabel()+')</th></tr>';
  const tbody=document.getElementById('ledger-body');if(!tbody)return;
  const data=[...approved].sort((a,b)=>b.date.localeCompare(a.date));
  const colspan=showShiftCol?6:5;
  if(!data.length){tbody.innerHTML='<tr><td colspan="'+colspan+'"><div class="empty-state"><i class="ti ti-calendar-off"></i>No approved records in this range</div></td></tr>';return}
  tbody.innerHTML=data.map(c=>'<tr><td>'+escHtml(c.workerName)+'</td><td>'+c.date+'</td><td><span class="badge '+c.type+'">'+(c.type==='probation'?'Probation':'Senior')+'</span></td>'+(showShiftCol?'<td>'+(c.shift?shiftLabel(c.shift):'—')+'</td>':'')+'<td>'+(c.checkinTime?formatCheckinTime(c.checkinTime):'—')+'</td><td class="pay-cell">'+currencySymbol()+(c.pay||0).toLocaleString()+'</td></tr>').join('')+'<tr style="background:var(--bg2)"><td colspan="'+(colspan-1)+'" style="font-weight:600;padding:12px 14px">Total</td><td class="pay-cell">'+currencySymbol()+total.toLocaleString()+'</td></tr>';
}

// ---- EXPORT ----
function downloadCsvRows(csvRows,filename){
  const csv=csvRows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:filename});
  a.click();URL.revokeObjectURL(a.href);showToast('CSV downloaded');
}
function exportCSV(){
  const approved=getFilteredApproved();
  if(!approved.length){showToast('No approved records to export');return}
  // Bug fix: the old export always produced a per-worker summary, which has no
  // single check-in time to show (a worker can have many check-ins across the
  // range). Now the CSV matches whichever ledger view is on screen: the Daily
  // log export includes each day's exact check-in time (and shift); the
  // Summary export stays aggregated per worker across the whole range.
  if(ledgerView==='daily')exportDailyCSV(approved);else exportSummaryCSV(approved);
}
function exportDailyCSV(approved){
  const showShiftCol=currentWarehouse==='LAGOS_DC';
  const rows=[...approved].sort((a,b)=>b.date.localeCompare(a.date));
  const header=['Worker Name','Date','Grade',...(showShiftCol?['Shift']:[]),'Check-in Time','Pay ('+currencyLabel()+')'];
  const total=rows.reduce((s,c)=>s+c.pay,0);
  const csvRows=[header,...rows.map(c=>[c.workerName,c.date,c.type==='probation'?'Probation':'Senior',...(showShiftCol?[c.shift?shiftLabel(c.shift):'—']:[]),c.checkinTime?formatCheckinTime(c.checkinTime):'—',c.pay]),[],['TOTAL','','',...(showShiftCol?['']:[]),'',total]];
  downloadCsvRows(csvRows,'warehouse_daily_log_'+csvRangeLabel()+'.csv');
}
function exportSummaryCSV(approved){
  const byWorker={};
  approved.forEach(c=>{
    const key=c.workerId||c.workerName;
    if(!byWorker[key]){
      const w=workers.find(x=>x.id===c.workerId)||workers.find(x=>x.name===c.workerName);
      byWorker[key]={name:c.workerName,type:c.type,days:0,pay:0,accountNumber:w?w.bankAccountNumber||'':'',bankName:w?w.bankName||'':'',warehouse:w?w.warehouse||'':''};
    }
    byWorker[key].days++;byWorker[key].pay+=c.pay;
  });
  const rows=Object.values(byWorker).sort((a,b)=>b.pay-a.pay);
  const total=rows.reduce((s,w)=>s+w.pay,0);
  const csvRows=[['Worker Name','Grade','Days Worked','Total Pay ('+currencyLabel()+')','Account Number','Bank Name','Warehouse'],...rows.map(w=>[w.name,w.type==='probation'?'Probation':'Senior',w.days,w.pay,w.accountNumber,w.bankName,w.warehouse]),[],['TOTAL','','',total,'','','']];
  downloadCsvRows(csvRows,'warehouse_payroll_summary_'+csvRangeLabel()+'.csv');
}
function csvRangeLabel(){
  const from=(document.getElementById('filter-from')||{value:''}).value;
  const to=(document.getElementById('filter-to')||{value:''}).value;
  if(from&&to) return from+'_to_'+to;
  if(from) return 'from_'+from;
  if(to) return 'up_to_'+to;
  return today();
}

// ---- WORKERS ----
function addWorker(){
  const name=document.getElementById('new-name').value.trim();
  const grade=document.getElementById('new-type').value;
  const startDate=document.getElementById('new-start').value||today();
  const homeWarehouse=document.getElementById('new-warehouse')?.value||currentWarehouse;
  if(!name){showToast('Enter worker name');return}
  if(workers.find(w=>w.name.toLowerCase()===name.toLowerCase())){showToast('Worker already exists');return}
  const w={id:nextWId++,name,startDate,gradeOverride:grade,homeWarehouse,allowedWarehouses:[homeWarehouse]};
  try{
    saveWorker(w);
    showToast(name+' added');
  } finally {
    document.getElementById('new-name').value='';
    document.getElementById('new-type').value='senior';
    document.getElementById('new-start').value='';
    const whSel=document.getElementById('new-warehouse');
    if(whSel) whSel.value=currentWarehouse;
    updateGradeOptions('new-type','new-warehouse');
  }
}
function removeWorker(fbKey){
  const w=workers.find(x=>x.fbKey===fbKey);if(!w)return;
  if(!confirm('Remove '+w.name+'? This also deletes their check-in history.'))return;
  wref('workers/'+fbKey).remove();
  // Remove their check-ins
  checkins.filter(c=>c.workerId===w.id).forEach(c=>{if(c.fbKey)wref('checkins/'+c.fbKey).remove()});
  showToast(w.name+' removed');
}
function editWorker(fbKey){
  const w=workers.find(x=>x.fbKey===fbKey);if(!w)return;
  document.getElementById('edit-worker-fbkey').value=fbKey;
  document.getElementById('edit-worker-name').value=w.name||'';
  document.getElementById('edit-worker-startdate').value=w.startDate||'';
  document.getElementById('edit-worker-grade').value=w.gradeOverride||'auto';
  document.getElementById('edit-worker-home-warehouse').value=w.homeWarehouse||currentWarehouse;
  updateGradeOptions('edit-worker-grade','edit-worker-home-warehouse');
  // Populate access checkboxes
  const allowed=w.allowedWarehouses||[w.homeWarehouse||currentWarehouse];
  ['LAGOS_DC','NAIROBI_DC'].forEach(wh=>{
    const cb=document.getElementById('access-'+wh);
    if(cb){ cb.checked=allowed.includes(wh); cb.disabled=(currentAdmin?.role!=='Super Admin'); }
  });
  // Only super admin can change access
  document.getElementById('edit-worker-access-checkboxes').style.opacity=currentAdmin?.role==='Super Admin'?'1':'0.5';
  // Reports PIN status
  const pinStatusEl = document.getElementById('edit-worker-pin-status');
  if(pinStatusEl){
    pinStatusEl.innerHTML = w.reportsPin
      ? `<span><i class="ti ti-lock"></i> PIN is set</span><button class="btn danger" style="font-size:12px;padding:6px 10px" onclick="resetReportsPin('${fbKey}')"><i class="ti ti-refresh"></i> Reset PIN</button>`
      : `<span style="color:var(--text2)"><i class="ti ti-lock-open"></i> No PIN set yet</span>`;
  }
  document.getElementById('edit-worker-error').style.display='none';
  document.getElementById('edit-worker-modal').classList.remove('hidden');
}
function hideEditWorkerModal(){
  document.getElementById('edit-worker-modal').classList.add('hidden');
}
function resetReportsPin(fbKey){
  if(!confirm('Reset this worker\'s Reports PIN? They will be asked to set a new one next time they view their reports.')) return;
  wref('workers/'+fbKey+'/reportsPin').set(null);
  showToast('PIN reset');
  const pinStatusEl = document.getElementById('edit-worker-pin-status');
  if(pinStatusEl) pinStatusEl.innerHTML = `<span style="color:var(--text2)"><i class="ti ti-lock-open"></i> No PIN set yet</span>`;
}
function saveWorkerEdits(){
  const fbKey=document.getElementById('edit-worker-fbkey').value;
  const name=document.getElementById('edit-worker-name').value.trim();
  const grade=document.getElementById('edit-worker-grade').value;
  const startDate=document.getElementById('edit-worker-startdate').value;
  if(!name||!startDate){const eEl=document.getElementById('edit-worker-error');eEl.textContent='Please fill in all fields';eEl.style.display='block';return;}
  const w=workers.find(x=>x.fbKey===fbKey);
  const oldName=w?w.name:null;
  if(oldName && oldName!==name && workers.find(x=>x.fbKey!==fbKey && x.name.toLowerCase()===name.toLowerCase())){
    document.getElementById('edit-worker-error').textContent='Another worker already has that name';
    document.getElementById('edit-worker-error').style.display='block';
    return;
  }
  const updates={name,startDate,gradeOverride:grade==='auto'?null:grade};
  wref('workers/'+fbKey).update(updates);
  if(oldName && oldName!==name){
    renameWorkerEverywhere(oldName,name);
  }
  hideEditWorkerModal();
  showToast(name+' updated successfully'+(oldName&&oldName!==name?' — today\'s check-in, reports, messages & scanner logs updated too':''));
}
// When a worker's name changes, relink every already-created record (not just future ones)
// so today's check-in, open scanner assignment, report threads, messages and batch/expiry
// reports all show under the new name immediately.
function renameWorkerEverywhere(oldName,newName){
  checkins.filter(c=>c.workerName===oldName).forEach(c=>{ if(c.fbKey) wref('checkins/'+c.fbKey+'/workerName').set(newName); });
  scannerLogs.filter(s=>s.workerName===oldName).forEach(s=>{ if(s.fbKey) wref('scannerLogs/'+s.fbKey+'/workerName').set(newName); });
  reports.filter(r=>r.workerName===oldName).forEach(r=>{ if(r.fbKey) wref('reports/'+r.fbKey+'/workerName').set(newName); });
  messages.filter(m=>m.with===oldName).forEach(m=>{
    if(!m.fbKey) return;
    const upd={with:newName};
    if(m.sender==='worker' && m.by===oldName) upd.by=newName;
    wref('messages/'+m.fbKey).update(upd);
  });
  batchReports.filter(b=>b.workerName===oldName).forEach(b=>{ if(b.fbKey) wref('batchReports/'+b.fbKey+'/workerName').set(newName); });
  expiryReports.filter(x=>x.workerName===oldName).forEach(x=>{ if(x.fbKey) wref('expiryReports/'+x.fbKey+'/workerName').set(newName); });
}
function editBankDetails(fbKey){
  const w=workers.find(x=>x.fbKey===fbKey);if(!w)return;
  pendingCheckinWorkerId=w.id;
  document.getElementById('bank-account-number').value=w.bankAccountNumber||'';
  document.getElementById('bank-name').value=w.bankName||'';
  document.getElementById('bank-warehouse').value=w.warehouse||'';
  showBankModal();
}
function renderManage(){
  const newWh=document.getElementById('new-warehouse');
  if(newWh)newWh.value=currentWarehouse;
  updateGradeOptions('new-type','new-warehouse');
  const list=document.getElementById('manage-list');if(!list)return;
  if(!workers.length){list.innerHTML='<div class="empty-state"><i class="ti ti-user-plus"></i>No workers yet.</div>';return}
  list.innerHTML=workers.map(w=>{
    const type=getType(w),pay=getPay(w);
    const start=new Date(w.startDate);
    const daysLeft=Math.max(0,PROBATION_DAYS-Math.floor((new Date()-start)/86400000));
    const meta=type==='probation'?'Started '+w.startDate+' · '+daysLeft+' days until senior':'Started '+w.startDate+' · Senior rate active';
    const bankInfo=w.bankAccountNumber?' · '+w.bankName+' '+w.bankAccountNumber+' · '+w.warehouse:' · <span style="color:var(--amber-text)">No bank details yet</span>';
    return '<div class="worker-card"><div class="worker-left"><div class="avatar '+type+'">'+initials(w.name)+'</div><div><div class="worker-name">'+w.name+'</div><div class="worker-meta">'+meta+bankInfo+'</div></div></div><div class="worker-right"><span class="badge '+type+'">'+currencySymbol()+pay.toLocaleString()+'/day</span><button class="btn" onclick="editWorker(\''+w.fbKey+'\')" title="Edit worker"><i class="ti ti-edit"></i></button><button class="btn" onclick="editBankDetails(\''+w.fbKey+'\')" title="Edit bank details"><i class="ti ti-building-bank"></i></button><button class="btn danger" onclick="removeWorker(\''+w.fbKey+'\')"><i class="ti ti-trash"></i></button></div></div>';
  }).join('');
}

// ---- ADMINS ----
function addAdmin(){
  const u=document.getElementById('admin-username').value.trim();
  const p=document.getElementById('admin-password').value;
  const r=document.getElementById('admin-role').value.trim();
  if(!u||!p||!r){showToast('Fill all fields');return}
  if(admins.find(a=>a.username===u)){showToast('Username already exists');return}
  const permissions={};
  let anyChecked=false;
  ADMIN_PERMISSIONS.forEach(perm=>{
    const cb=document.getElementById('admin-perm-'+perm.key);
    if(cb&&cb.checked){permissions[perm.key]=true;anyChecked=true;}
  });
  const a={id:nextAId++,username:u,password:p,role:r};
  if(anyChecked) a.permissions=permissions; // leaving all unchecked = full access (legacy behavior)
  saveAdmin(a);
  document.getElementById('admin-username').value='';document.getElementById('admin-password').value='';document.getElementById('admin-role').value='';
  document.querySelectorAll('#admin-permission-checkboxes input[type=checkbox]').forEach(cb=>cb.checked=false);
  showToast(r+' added as admin');
}
function renderAdminPermCheckboxes(){
  const wrap=document.getElementById('admin-permission-checkboxes');if(!wrap)return;
  wrap.innerHTML=ADMIN_PERMISSIONS.map(perm=>'<label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="admin-perm-'+perm.key+'"> '+perm.label+'</label>').join('');
}
function toggleAdminPermission(fbKey,key){
  const a=admins.find(x=>x.fbKey===fbKey);if(!a)return;
  if(a.role==='Super Admin'){showToast('Super Admin always has full access');return}
  const perms={...(a.permissions||Object.fromEntries(ADMIN_PERMISSIONS.map(p=>[p.key,true])))};
  perms[key]=!perms[key];
  adminRef(fbKey+'/permissions').set(perms);
}
function removeAdmin(fbKey){
  if(admins.length<=1){showToast('Cannot remove the only admin');return}
  const a=admins.find(x=>x.fbKey===fbKey);if(!a)return;
  if(a.fbKey===currentAdmin?.fbKey){showToast('Cannot remove yourself');return}
  if(!confirm('Remove admin: '+a.role+'?'))return;
  adminRef(fbKey).remove();showToast('Admin removed');
}
function changePassword(){
  const val=document.getElementById('change-pw-admin').value;
  const np=document.getElementById('change-pw-new').value;
  const cp=document.getElementById('change-pw-confirm').value;
  if(!np){showToast('Enter a new password');return}
  if(np!==cp){showToast('Passwords do not match');return}
  if(np.length<4){showToast('Password must be at least 4 characters');return}
  const a=admins.find(x=>x.fbKey===val);if(!a)return;
  a.password=np;adminRef(val+'/password').set(np);
  document.getElementById('change-pw-new').value='';document.getElementById('change-pw-confirm').value='';
  showToast('Password updated for '+a.role);
}
function renderAdmins(){
  const list=document.getElementById('admin-list');if(!list)return;
  list.innerHTML=admins.map(a=>{
    const permsLine = a.role==='Super Admin'
      ? '<div class="worker-meta">All tabs (Super Admin)</div>'
      : '<div class="worker-meta" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">'+ADMIN_PERMISSIONS.map(perm=>{
          const on = adminHasPerm(perm.key,a);
          return '<span class="badge '+(on?'approved':'pending')+'" style="cursor:pointer;font-size:10px" onclick="toggleAdminPermission(\''+a.fbKey+'\',\''+perm.key+'\')" title="Click to toggle">'+perm.label+'</span>';
        }).join('')+'</div>';
    return '<div class="worker-card"><div class="worker-left"><div class="avatar senior">'+initials(a.role)+'</div><div><div class="worker-name">'+a.role+'</div><div class="worker-meta">@'+a.username+(a.fbKey===currentAdmin?.fbKey?' · You':'')+'</div>'+permsLine+'</div></div><div class="worker-right">'+(a.fbKey!==currentAdmin?.fbKey?'<button class="btn danger" onclick="removeAdmin(\''+a.fbKey+'\')"><i class="ti ti-trash"></i></button>':'<span class="badge approved">Active</span>')+'</div></div>';
  }).join('');
  const sel=document.getElementById('change-pw-admin');
  if(sel)sel.innerHTML=admins.map(a=>'<option value="'+a.fbKey+'">'+a.role+' (@'+a.username+')</option>').join('');
}

// ---- SHEETS ----
function saveScriptUrl(){settings.scriptUrl=(document.getElementById('script-url')||{value:''}).value.trim();saveSettings()}
function testConnection(){
  const url=settings.scriptUrl;if(!url){showToast('Paste the Apps Script URL first');return}
  document.getElementById('conn-status').textContent='Testing…';
  fetch(url+'?action=ping').then(r=>r.json()).then(d=>{
    document.getElementById('conn-status').textContent=d.status==='ok'?'✓ Connected':'✗ Error: '+d.message;
    if(d.status==='ok')showToast('Connection successful!');
  }).catch(()=>{document.getElementById('conn-status').textContent='✗ Could not connect'});
}
function getWeekData(){
  const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
  const from=toLocalISO(mon);const to=today();
  return checkins.filter(c=>c.status==='approved'&&c.date>=from&&c.date<=to);
}
function buildSyncPayload(data){
  const summary={};
  data.forEach(c=>{const key=c.workerId||c.workerName;if(!summary[key])summary[key]={name:c.workerName,days:0,totalPay:0,type:c.type};summary[key].days++;summary[key].totalPay+=c.pay;});
  // Include each worker's check-in time (formatted, e.g. "8:03 AM") and shift
  // (Morning/Night, where recorded) on every raw row so the "Raw Attendance"
  // performance sheet shows when each worker checked in and which shift they
  // were on, not just the date.
  const raw = data.map(c=>Object.assign({}, c, {
    checkInTimeFormatted: c.checkinTime ? formatCheckinTime(c.checkinTime) : (c.time||''),
    shiftFormatted: c.shift ? shiftLabel(c.shift) : ''
  }));
  return{action:'sync',weekStart:data.length?data[0].date:'',records:Object.values(summary),raw:raw,syncedAt:new Date().toISOString(),syncedBy:currentAdmin?.role||'Admin'};
}
function syncNow(mode){
  const url=settings.scriptUrl;if(!url){showToast('Set the Apps Script URL in Sheets tab first');return}
  const data=mode==='week'?getWeekData():checkins.filter(c=>c.status==='approved');
  if(!data.length){showToast('No approved check-ins to sync');return}
  showToast('Syncing '+data.length+' records…');
  fetch(url,{method:'POST',body:JSON.stringify(buildSyncPayload(data))}).then(r=>r.json()).then(d=>{
    if(d.status==='ok'){settings.lastSync=new Date().toISOString();saveSettings();document.getElementById('last-sync').textContent='Last sync: '+new Date().toLocaleString('en-US',{hour12:true});showToast('✓ Synced to Google Sheets!');}
    else showToast('Sync error: '+d.message);
  }).catch(()=>showToast('Sync failed — check URL and connection'));
}
function toggleAutoSync(){settings.autoSync=!settings.autoSync;if(settings.autoSync)settings.manualOnly=false;saveSettings();renderSheetsSettings();showToast(settings.autoSync?'Auto-sync enabled':'Auto-sync disabled')}
function toggleManual(){settings.manualOnly=!settings.manualOnly;if(settings.manualOnly)settings.autoSync=false;saveSettings();renderSheetsSettings()}
function renderSheetsSettings(){
  const at=document.getElementById('auto-sync-toggle');const mt=document.getElementById('manual-toggle');
  if(at)at.className='toggle'+(settings.autoSync?' on':'');
  if(mt)mt.className='toggle'+(settings.manualOnly?' on':'');
  const su=document.getElementById('script-url');if(su&&settings.scriptUrl)su.value=settings.scriptUrl;
  const ls=document.getElementById('last-sync');if(ls&&settings.lastSync)ls.textContent='Last sync: '+new Date(settings.lastSync).toLocaleString('en-US',{hour12:true});
  const swu=document.getElementById('slack-webhook-url');if(swu&&settings.slackWebhookUrl)swu.value=settings.slackWebhookUrl;
  const sat=document.getElementById('slack-auto-toggle');if(sat)sat.className='toggle'+(settings.slackAutoSend?' on':'');
  const sls=document.getElementById('slack-last-sent');if(sls)sls.textContent=settings.slackLastSent?'Last sent to Slack: '+new Date(settings.slackLastSent).toLocaleString('en-US',{hour12:true}):'Not sent yet';
  renderBubbleVisibility();
}
function downloadScript(){
  const code=`// Warehouse Check-in — Google Apps Script\nconst SHEET_NAME="Payroll";const RAW_SHEET="Raw Attendance";\nfunction doGet(e){if(e.parameter.action==="ping")return jsonResponse({status:"ok",message:"Connected"});return jsonResponse({status:"error",message:"Use POST"});}\nfunction doPost(e){try{const p=JSON.parse(e.postData.contents);if(p.action==="sync"){writeToSheet(p);return jsonResponse({status:"ok",message:"Synced"});}return jsonResponse({status:"error",message:"Unknown action"});}catch(err){return jsonResponse({status:"error",message:err.toString()});}}\nfunction writeToSheet(p){const ss=SpreadsheetApp.getActiveSpreadsheet();let s=ss.getSheetByName(SHEET_NAME);if(!s)s=ss.insertSheet(SHEET_NAME);if(s.getLastRow()===0){s.appendRow(["Worker Name","Grade","Days Worked","Total Pay (NGN)","Week Of","Synced At","Synced By"]);s.getRange(1,1,1,7).setFontWeight("bold").setBackground("#1a1a18").setFontColor("#ffffff");}const wk=p.weekStart||new Date().toISOString().split("T")[0];p.records.forEach(r=>s.appendRow([r.name,r.type==="probation"?"Probation":"Senior",r.days,r.totalPay,wk,p.syncedAt,p.syncedBy]));s.autoResizeColumns(1,7);let raw=ss.getSheetByName(RAW_SHEET);if(!raw)raw=ss.insertSheet(RAW_SHEET);if(raw.getLastRow()===0){raw.appendRow(["Worker Name","Date","Check-in Time","Shift","Grade","Pay (NGN)","Synced At"]);raw.getRange(1,1,1,7).setFontWeight("bold").setBackground("#1a1a18").setFontColor("#ffffff");}p.raw.forEach(r=>raw.appendRow([r.workerName,r.date,r.checkInTimeFormatted||"",r.shiftFormatted||"",r.type==="probation"?"Probation":"Senior",r.pay,p.syncedAt]));raw.autoResizeColumns(1,7);}\nfunction jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}`;
  const blob=new Blob([code],{type:'text/javascript'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'warehouse_apps_script.js'});
  a.click();URL.revokeObjectURL(a.href);showToast('Apps Script downloaded');
}
function checkAutoSync(){
  if(!settings.autoSync||!settings.scriptUrl)return;
  const now=new Date();
  if(now.getDay()===0){const ls=settings.lastSync?new Date(settings.lastSync).toDateString():'';if(ls!==now.toDateString())syncNow('week');}
}

// ════════════════════════════════════════
// ---- SLACK — daily packing summary ----
// ════════════════════════════════════════
function saveSlackWebhook(){
  settings.slackWebhookUrl = (document.getElementById('slack-webhook-url')||{value:''}).value.trim();
  saveSettings();
}
function toggleSlackAutoSend(){
  settings.slackAutoSend = !settings.slackAutoSend;
  saveSettings();
  renderSheetsSettings();
  showToast(settings.slackAutoSend ? 'Daily Slack summary enabled' : 'Daily Slack summary disabled');
}
function buildSlackPackingSummary(dateStr){
  // Only batches that have actually been moved to dispatch (pickupAt set) are reported —
  // pending (not-yet-dispatched) batches are left out of the outbound summary entirely.
  const dayProd = production.filter(p=>p.date===dateStr && getTaskType(p)==='packing' && p.pickupAt);
  const totalOrders = dayProd.reduce((s,p)=>s+(p.orders||0),0);
  const totalSkus = dayProd.reduce((s,p)=>s+(p.skus||0),0);
  const totalWeight = dayProd.reduce((s,p)=>s+(p.weight||0),0);
  const totalCartons = dayProd.reduce((s,p)=>s+(p.cartons||0),0);
  const whLabel = (WAREHOUSE_LOCATIONS && WAREHOUSE_LOCATIONS[currentWarehouse] && WAREHOUSE_LOCATIONS[currentWarehouse].label) || currentWarehouse;
  let text = '📦 *Outbound summary — '+dateStr+'* ('+whLabel+')\n';
  text += '*'+totalOrders.toLocaleString()+'* orders · *'+totalSkus.toLocaleString()+'* SKUs · *'+totalCartons.toLocaleString()+'* cartons · *'+totalWeight.toLocaleString()+'kg* across '+dayProd.length+' batch(es) dispatched\n\n';
  if(!dayProd.length){
    text += '_No batches were dispatched for this date._';
    return text;
  }
  // Group entries by market region (state) so each state gets its own header + table
  const groups = {};
  dayProd.forEach(p=>{
    const region = (p.marketRegion||'').trim() || 'Unassigned region';
    (groups[region] = groups[region] || []).push(p);
  });
  const regionNames = Object.keys(groups).sort((a,b)=>{
    if(a==='Unassigned region') return 1;
    if(b==='Unassigned region') return -1;
    return a.localeCompare(b);
  });
  const ROW_CAP = 60; // total rows across all groups, to keep the message a reasonable size
  let rowsUsed = 0, truncated = false;
  regionNames.forEach(region=>{
    const rows = groups[region].slice().sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
    const regionOrders = rows.reduce((s,p)=>s+(p.orders||0),0);
    text += '*📍 '+region+'* — '+rows.length+' batch(es), '+regionOrders.toLocaleString()+' orders\n';
    const rowsToShow = rows.slice(0, Math.max(0, ROW_CAP - rowsUsed));
    if(rowsToShow.length < rows.length) truncated = true;
    rowsUsed += rowsToShow.length;
    if(!rowsToShow.length){ text += '_(more batches omitted — see app for full detail)_\n\n'; return; }
    const col = (s,len)=>{ s=String(s==null?'':s); return (s.length>len ? s.slice(0,len-1)+'…' : s).padEnd(len); };
    let table = col('Time',6)+col('Customer',18)+col('Orders',7)+col('SKUs',6)+col('Wt(kg)',8)+col('Ctn',5)+col('3PL',16)+'Packed by\n';
    rowsToShow.forEach(p=>{
      table += col(p.time||'',6)+col(p.customer||'—',18)+col(p.orders||0,7)+col(p.skus||0,6)+col(p.weight||'—',8)+col(p.cartons||'—',5)+col(p.dispatch3PL||'—',16)+currentWarehouse+'\n';
    });
    text += '```'+table+'```\n';
  });
  if(truncated) text += '_…additional batches omitted to keep this message a reasonable size — see the app for full detail._';
  return text;
}
function sendToSlack(text){
  if(!settings.slackWebhookUrl) return Promise.resolve(false);
  // Slack's incoming-webhook endpoint doesn't send CORS headers for application/json,
  // so we post as text/plain (a CORS-safelisted content type) — Slack still parses the JSON body fine.
  return fetch(settings.slackWebhookUrl, {
    method: 'POST',
    headers: {'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({text})
  }).then(()=>true).catch(err=>{ console.error('Slack send failed', err); return false; });
}
function testSlackWebhook(){
  if(!settings.slackWebhookUrl){ showToast('Add a Slack webhook URL first'); return; }
  sendToSlack('✅ Test message from the Warehouse Check-in app — Slack connection working.').then(ok=>{
    showToast(ok ? 'Test message sent — check Slack' : 'Could not reach Slack — check the URL');
  });
}
function sendSlackPackingSummaryNow(){
  if(!settings.slackWebhookUrl){ showToast('Add a Slack webhook URL first'); return; }
  sendToSlack(buildSlackPackingSummary(today())).then(ok=>{
    if(ok){
      settings.slackLastSent = new Date().toISOString();
      saveSettings(); renderSheetsSettings();
      showToast('Outbound summary sent to Slack');
    } else {
      showToast('Could not send to Slack — check the URL');
    }
  });
}
function checkSlackAutoSend(){
  if(!settings.slackAutoSend || !settings.slackWebhookUrl) return;
  const now = new Date();
  if(now.getHours()!==0) return; // only fires in the 12:00–12:59 AM window
  const todayKey = now.toDateString();
  if(settings.slackLastAutoSendDay === todayKey) return; // already sent for this day boundary
  const y = new Date(now); y.setDate(y.getDate()-1);
  const pad = n=>String(n).padStart(2,'0');
  const yStr = y.getFullYear()+'-'+pad(y.getMonth()+1)+'-'+pad(y.getDate());
  sendToSlack(buildSlackPackingSummary(yStr)).then(ok=>{
    if(ok){
      settings.slackLastAutoSendDay = todayKey;
      settings.slackLastSent = new Date().toISOString();
      saveSettings(); renderSheetsSettings();
    }
  });
}
function downloadSlackFunction(){
  const code=`// Firebase Cloud Function — Daily Slack outbound summary at 12:00 AM
// Guarantees delivery every night even if nobody has the app open.
//
// SETUP:
// 1) Paste your Slack Incoming Webhook URL below.
// 2) List the warehouse key(s) used in your Firebase Realtime Database (the same
//    keys this app uses, e.g. "LAGOS_DC"). Find them as the top-level nodes in your DB.
// 3) In your Firebase project folder: firebase init functions (choose Node 18+),
//    replace the generated functions/index.js with this file, then:
//      firebase deploy --only functions
// 4) Adjust the "timeZone" below if your warehouse isn't in Africa/Lagos.

const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();

const SLACK_WEBHOOK_URL = 'PASTE_YOUR_SLACK_WEBHOOK_URL_HERE';
const WAREHOUSES = ['PASTE_YOUR_WAREHOUSE_KEY_HERE']; // e.g. ['LAGOS_DC','NAIROBI_DC']

exports.dailyPackingSummary = onSchedule({schedule: '0 0 * * *', timeZone: 'Africa/Lagos'}, async () => {
  const db = admin.database();
  const y = new Date(Date.now() - 24*60*60*1000);
  const pad = n => String(n).padStart(2,'0');
  const yesterday = y.getFullYear()+'-'+pad(y.getMonth()+1)+'-'+pad(y.getDate());

  for (const wh of WAREHOUSES) {
    const snap = await db.ref(wh+'/production').once('value');
    const entries = [];
    // Only batches that were actually moved to dispatch (pickupAt set) are reported —
    // pending (not-yet-dispatched) batches are left out of the outbound summary.
    snap.forEach(c => {
      const v = c.val();
      if (v && v.date === yesterday && (v.taskType||'picking') === 'packing' && v.pickupAt) entries.push(v);
    });
    const totalOrders = entries.reduce((s,e)=>s+(e.orders||0),0);
    const totalSkus = entries.reduce((s,e)=>s+(e.skus||0),0);
    const totalWeight = entries.reduce((s,e)=>s+(e.weight||0),0);
    const totalCartons = entries.reduce((s,e)=>s+(e.cartons||0),0);

    let text = \`📦 *Outbound summary — \${yesterday}* (\${wh})\\n*\${totalOrders}* orders · *\${totalSkus}* SKUs · *\${totalCartons}* cartons · *\${totalWeight}kg* across \${entries.length} batch(es) dispatched\\n\\n\`;
    if (!entries.length) {
      text += '_No batches were dispatched for this date._';
    } else {
      const groups = {};
      entries.forEach(e=>{
        const region = (e.marketRegion||'').trim() || 'Unassigned region';
        (groups[region] = groups[region] || []).push(e);
      });
      const regionNames = Object.keys(groups).sort((a,b)=>{
        if (a==='Unassigned region') return 1;
        if (b==='Unassigned region') return -1;
        return a.localeCompare(b);
      });
      const col = (s,len) => { s = String(s==null?'':s); return (s.length>len ? s.slice(0,len-1)+'…' : s).padEnd(len); };
      const ROW_CAP = 60;
      let rowsUsed = 0, truncated = false;
      regionNames.forEach(region=>{
        const rows = groups[region].slice().sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
        const regionOrders = rows.reduce((s,e)=>s+(e.orders||0),0);
        text += \`*📍 \${region}* — \${rows.length} batch(es), \${regionOrders} orders\\n\`;
        const rowsToShow = rows.slice(0, Math.max(0, ROW_CAP - rowsUsed));
        if (rowsToShow.length < rows.length) truncated = true;
        rowsUsed += rowsToShow.length;
        if (!rowsToShow.length) { text += '_(more batches omitted — see app for full detail)_\\n\\n'; return; }
        let table = col('Time',6)+col('Customer',18)+col('Orders',7)+col('SKUs',6)+col('Wt(kg)',8)+col('Ctn',5)+col('3PL',16)+'Packed by\\n';
        rowsToShow.forEach(e=>{
          table += col(e.time||'',6)+col(e.customer||'—',18)+col(e.orders||0,7)+col(e.skus||0,6)+col(e.weight||'—',8)+col(e.cartons||'—',5)+col(e.dispatch3PL||'—',16)+wh+'\\n';
        });
        text += '\`\`\`'+table+'\`\`\`\\n';
      });
      if (truncated) text += '_…additional batches omitted to keep this message a reasonable size — see the app for full detail._';
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
  }
});
`;
  const blob=new Blob([code],{type:'text/javascript'});
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:'index.js'});
  a.click();URL.revokeObjectURL(a.href);
  showToast('Cloud Function downloaded — see setup instructions above');
}
// ════════════════════════════════════════
// ---- SCANNER MANAGEMENT ----
// ════════════════════════════════════════
const TOTAL_SCANNERS = 20;
let scannerLogs = []; // loaded from Firebase
let production = []; // orders/SKUs logged per worker per day, loaded from Firebase
let pendingProductionWorkerId = null;
let pendingProductionType = 'picking';
let pendingEditFbKey = null;
let pendingProductionMarket = null;
let pendingProductionOrderId = null;
let pendingProductionMatchedName = null;
let pendingAssignOrderFbKey = null; // order currently open in the "Assign workers" modal
let outboundFilter = 'pending';
let outboundViewType = 'packing';
let pendingOutboundFbKey = null;
const PRODUCTION_TYPES = {
  picking:{label:'Picking',icon:'🧺',short:'picked'},
  packing:{label:'Packing',icon:'📦',short:'packed'},
  replenishment:{label:'Replenishment',icon:'🔄',short:'replenished'},
  putaway:{label:'Putaway',icon:'📥',short:'put away'}
};
// Supplier master list — sourced from the warehouse's supplier export, used to
// populate the Putaway dropdown so workers select instead of free-typing names.
const SUPPLIER_LIST = ["ADLER LGS", "Agary LGS", "Al-tinez Pharma Ltd", "Alpha Pharm", "Annie Pharma LGS", "Aquatix", "ASSENE LGS", "Ava Healthcare Limited", "Avro Pharma", "Bazreal Global LGS", "Blissland LGS", "Blissland Packpoint", "BOND LGS", "Chez Resources", "CHI LGS", "Clarion LGS", "DANA LGS", "Dele HMA Medical", "Diamond Healthcare Ltd", "DKT", "Dony Triumph", "Eden Pharma", "ELBE LGS", "Emzor LGS", "Evans Therapeutics LGS", "FARMEX MEYER LGS", "Fidson LGS", "GENEITH LGS", "Genezee Healthcare", "Greenlife Jaguar", "HOVID LGS", "JAWA LGS", "Juhel LGS", "Kentoni Pharma", "KRISHAT", "KST Pharma", "LAIDER LGS", "Litmus Lifesciences", "Lyn-Edge Pharma", "Marie Stopes", "May & Baker LGS", "Mecure", "Mega Lifesciences", "MICRONOVA LGS", "Micronova V-Care", "MOKO LGS", "Mopson LGS", "Najbel Pack Point", "Neatline Pharmacy", "NEW HEIGHTS LGS", "ORANGE DRUGS LGS", "OSWORTH PHARMA", "PEMASON LGS", "Pharm Ethics LGS", "PharmacyPlus", "Phillips LGS", "Pinnacle Health", "Pocco LGS", "Precious Trust Ltd", "Ralphones", "Ranbaxy", "REALS LGS", "Root Drugs", "RUPHINO LGS", "Sagar Vitaceuticals Nig Ltd", "Sam Pharma LGS", "Saro Lifecare", "Scordle Limited", "SEAGREEN LGS", "SFH LGS", "SHALINA LGS", "Shelf Life Delta Held", "Shelf Life Edo Held", "Shelf Life Enugu Held", "Shelf Life FCT Held", "Shelf Life Kaduna Held", "Shelf Life PH Held", "Shipsy Test Supplier", "SKG LGS", "Softhealth LGS", "Superior Pharma", "SUPPLIER1", "SWIFA LGS", "Sygen LGS", "SYLKEN LGS", "Systs Engineering", "Tandem Pharma", "Taylek LGS", "Therapeutics", "Threshold Pharmacy LGS", "Tolaram Health", "Tolaram Wellness", "Unimedical", "VINCO PHARMA", "Vitabiotics Nig LTD", "VIXA LGS", "WWCVL LGS"];
let analyticsRangeType = 'month';
let trendGranularity = 'week'; // 'day' | 'week' | 'month' — chart bucketing for the order-volume trend


function getTodayScannerLogs() {
  return scannerLogs.filter(s => s.date === today());
}
// Scanners/phones currently checked out — ANY date, not just today. Scoping
// "currently checked out" to today only was a real bug, not just a stale
// number: a scanner picked up yesterday and never returned would silently
// count as "available" again today (risking it being handed to a second
// person while the first still physically has it), the worker who has it
// would have no way to return it (the return dropdown only listed today's
// logs), and it would never show as overdue since "overdue" was also
// scoped to today only — the one case it most needed to catch.
function getActiveScannerLogs() {
  return scannerLogs.filter(s => !s.returnedAt);
}

function getAvailableScanners() {
  const activeLogs = getActiveScannerLogs();
  const pickedUp = activeLogs.filter(s => !s.isMobile).map(s => s.scannerNum);
  const available = [];
  for(let i=1; i<=TOTAL_SCANNERS; i++) {
    if(!pickedUp.includes(i)) available.push(i);
  }
  return available;
}

function getWorkerCurrentScanner(workerName) {
  return getActiveScannerLogs().find(s => s.workerName === workerName) || null;
}

function toggleScannerGuestInput(prefix){
  const sel = document.getElementById(prefix+'-worker');
  if(!sel) return;
  const isGuest = sel.value === '__other__';
  const row = document.getElementById(prefix+'-guest-row');
  if(row) row.style.display = isGuest ? 'flex' : 'none';
  if(!isGuest){
    const nameEl = document.getElementById(prefix+'-guest-name');
    if(nameEl) nameEl.value='';
  }
}

function assignDeviceForCheckin(workerName, device){
  if(!device) return;
  if(getWorkerCurrentScanner(workerName)) return;
  const sNum = device==='mobile' ? null : parseInt(device);
  const log = {
    workerName,
    scannerNum: sNum || 'Mobile',
    isMobile: !sNum,
    isGuest: false,
    date: today(),
    pickedUpAt: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}),
    returnedAt: null
  };
  wref('scannerLogs').push(log);
}

let pendingPickupWorkerId=null;
function openPickupScannerModal(workerId){
  const w=workers.find(x=>x.id===workerId);if(!w)return;
  const ci=getCheckinState(workerId);
  if(!ci||!ci.isMobile){showToast('This worker is not currently using a phone');return;}
  const available=getAvailableScanners();
  const grid=document.getElementById('pickup-scanner-grid');
  if(grid){
    grid.innerHTML = available.length ? available.map(n=>`<button class="btn" onclick="pickUpScanner(${n})" style="justify-content:center;padding:12px"><i class="ti ti-barcode"></i> Scanner ${n}</button>`).join('') : '<div style="grid-column:1/-1;font-size:12px;color:var(--text2);text-align:center;padding:6px">No scanners currently available</div>';
  }
  pendingPickupWorkerId=workerId;
  document.getElementById('pickup-scanner-modal').classList.remove('hidden');
}
function hidePickupScannerModal(){
  document.getElementById('pickup-scanner-modal').classList.add('hidden');
  pendingPickupWorkerId=null;
}
function pickUpScanner(scannerNum){
  const workerId=pendingPickupWorkerId;
  const w=workers.find(x=>x.id===workerId);if(!w){hidePickupScannerModal();return;}
  const ci=getCheckinState(workerId);
  if(!ci||!ci.isMobile){showToast('This worker is not currently using a phone');hidePickupScannerModal();return;}
  if(getAvailableScanners().indexOf(scannerNum)===-1){showToast('Scanner '+scannerNum+' is no longer available');hidePickupScannerModal();renderCheckin();return;}
  // Return the worker's current mobile scanner-log entry
  const mobileLog=getWorkerCurrentScanner(w.name);
  if(mobileLog&&mobileLog.fbKey&&mobileLog.isMobile){
    wref('scannerLogs/'+mobileLog.fbKey+'/returnedAt').set(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}));
  }
  // Pick up the new scanner
  const log={
    workerName:w.name,
    scannerNum,
    isMobile:false,
    isGuest:false,
    date:today(),
    pickedUpAt:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}),
    returnedAt:null
  };
  wref('scannerLogs').push(log);
  // Update today's check-in record to reflect the new device
  ci.isMobile=false;
  ci.scannerNum=scannerNum;
  if(ci.fbKey){wref('checkins/'+ci.fbKey).update({isMobile:false,scannerNum});}
  hidePickupScannerModal();
  showToast(w.name+' picked up Scanner '+scannerNum);
  renderCheckin();
}
function deviceLabel(c){
  if(c.isMobile===undefined && c.scannerNum===undefined) return '';
  return c.isMobile ? 'Using phone' : ('Scanner '+c.scannerNum);
}

function returnScanner(prefix) {
  prefix = prefix || 'scanner-return';
  const selVal = document.getElementById(prefix+'-worker').value;
  let wName = selVal;
  if(selVal === '__other__'){
    wName = document.getElementById(prefix+'-guest-name').value.trim();
    if(!wName) { showToast('Please enter your name'); return; }
  }
  const numSelVal = document.getElementById(prefix+'-number').value;
  if(!wName) { showToast('Please select your name'); return; }
  if(!numSelVal) { showToast('Please select a device to return'); return; }
  const log = getActiveScannerLogs().find(s => s.fbKey === numSelVal);
  if(!log) { showToast('No active check-in found for this selection'); return; }
  wref('scannerLogs/'+log.fbKey+'/returnedAt').set(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}));
  const guestNameEl = document.getElementById(prefix+'-guest-name');
  if(guestNameEl) guestNameEl.value='';
  const label = log.isMobile ? 'Mobile phone' : `Scanner ${log.scannerNum}`;
  showToast(`${label} returned by ${wName}`);
}

function updateScannerBadge() {
  const overdue = getActiveScannerLogs().length;
  const b = document.getElementById('scanner-overdue-badge');
  if(b) { b.style.display = overdue > 0 ? 'inline' : 'none'; b.textContent = overdue; }
}

function populateReturnCard(prefix){
  const el = document.getElementById(prefix+'-worker');
  if(!el) return;
  const wOptsReturn = '<option value="">— Select your name —</option>' + '<option value="__other__">➕ I\'m not on the list…</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  const cur=el.value; el.innerHTML = wOptsReturn; if(cur==='__other__')el.value='__other__';
  const returnSel = document.getElementById(prefix+'-number');
  if(returnSel) {
    const activeLogs = getActiveScannerLogs();
    returnSel.innerHTML = '<option value="">— Select device —</option>' + activeLogs.map(s=>{
      const label = s.isMobile ? `📱 Mobile phone (${s.workerName})` : `Scanner ${s.scannerNum} (${s.workerName})`;
      return `<option value="${s.fbKey}">${label}</option>`;
    }).join('');
  }
}

function toggleCheckinReturnCard(){
  const body = document.getElementById('checkin-return-body');
  const chevron = document.getElementById('checkin-return-chevron');
  if(!body) return;
  const open = body.style.display==='block';
  body.style.display = open ? 'none' : 'block';
  if(chevron) chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

function renderScanner() {
  populateReturnCard('scanner-return');

  // Stats
  const todayLogs = getTodayScannerLogs();
  // "In use" / "Available" need to reflect the TRUE current state (any date —
  // see getActiveScannerLogs), and only physical scanners count against the
  // 20-scanner pool. Mobile-phone check-ins were previously counted here too,
  // which silently shrank "Available" even when no physical scanner was
  // actually out.
  const activeScanners = getActiveScannerLogs().filter(s => !s.isMobile).length;
  const returned = todayLogs.filter(s => s.returnedAt).length;
  const statEl = document.getElementById('scanner-stats');
  if(statEl) statEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">In use</div><div class="stat-value" style="color:var(--amber-text)">${activeScanners}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Returned today</div><div class="stat-value" style="color:var(--green-text)">${returned}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Available</div><div class="stat-value">${TOTAL_SCANNERS - activeScanners}</div></div>`;

  // Log table — all 20 physical scanners + mobile phone entries
  const tbody = document.getElementById('scanner-log-body');
  if(!tbody) return;
  const rows = [];

  // Mobile phone entries: today's activity, plus any mobile check-in from a
  // previous day that's still active (never explicitly returned) — otherwise
  // a stale one would just silently vanish from view once the day rolled
  // over, instead of surfacing as something that needs resolving.
  const mobileLogs = [...todayLogs.filter(s => s.isMobile), ...getActiveScannerLogs().filter(s => s.isMobile && s.date!==today())];
  mobileLogs.forEach(s => {
    const isActive = !s.returnedAt;
    const statusBadge = isActive
      ? `<span class="badge" style="background:var(--amber-bg);color:var(--amber-text);border:0.5px solid var(--amber-border)">In Use</span>`
      : `<span class="badge approved">Returned</span>`;
    rows.push(`<tr>
      <td style="font-weight:600">📱 Mobile</td>
      <td>${s.workerName}${s.isGuest?' <span class="badge" style="background:var(--amber-bg);color:var(--amber-text);border:0.5px solid var(--amber-border);font-size:10px">Guest</span>':''}</td>
      <td>${s.pickedUpAt || '—'}${s.date!==today()?' ('+s.date+')':''}</td>
      <td>${s.returnedAt || '—'}</td>
      <td>${statusBadge}</td>
    </tr>`);
  });

  // Physical scanners S-01 to S-20 — check ANY date for a still-active log
  // first (see getActiveScannerLogs), so a scanner out since yesterday shows
  // as genuinely "In Use" here instead of wrongly "Available". Only fall back
  // to today's most recent (already-returned) log for informational display
  // when nothing is currently active.
  for(let i=1; i<=TOTAL_SCANNERS; i++) {
    const activeLog = getActiveScannerLogs().find(s => !s.isMobile && s.scannerNum === i);
    const log = activeLog
      || todayLogs.filter(s => !s.isMobile && s.scannerNum === i).sort((a,b)=>(b.pickedUpAt||'').localeCompare(a.pickedUpAt||'')).find(()=>true);
    const isActive = !!activeLog;
    const statusBadge = !log
      ? `<span class="badge" style="background:var(--green-bg);color:var(--green-text);border:0.5px solid var(--green-border)">Available</span>`
      : isActive
        ? `<span class="badge" style="background:var(--amber-bg);color:var(--amber-text);border:0.5px solid var(--amber-border)">In Use</span>`
        : `<span class="badge approved">Returned</span>`;
    rows.push(`<tr>
      <td style="font-weight:600">S-${String(i).padStart(2,'0')}</td>
      <td>${log ? log.workerName + (log.isGuest?' <span class="badge" style="background:var(--amber-bg);color:var(--amber-text);border:0.5px solid var(--amber-border);font-size:10px">Guest</span>':'') : '—'}</td>
      <td>${log ? log.pickedUpAt + (isActive && log.date!==today() ? ' ('+log.date+')' : '') : '—'}</td>
      <td>${log && log.returnedAt ? log.returnedAt : '—'}</td>
      <td>${statusBadge}</td>
    </tr>`);
  }
  tbody.innerHTML = rows.join('');

  // Show export for admins
  const adminEl = document.getElementById('scanner-admin-actions');
  if(adminEl) adminEl.style.display = currentAdmin ? 'block' : 'none';
}

function exportScannerCSV() {
  const from=(document.getElementById('scanner-filter-from')||{value:''}).value;
  const to=(document.getElementById('scanner-filter-to')||{value:''}).value;
  let logs = scannerLogs.slice();
  if(from) logs = logs.filter(s=>s.date>=from);
  if(to) logs = logs.filter(s=>s.date<=to);
  logs = logs.sort((a,b) => b.date.localeCompare(a.date));
  if(!logs.length) { showToast('No scanner logs to export in this range'); return; }
  const rows = [['Date','Worker Name','Scanner #','Picked Up','Returned','Duration'],...logs.map(s => {
    let duration = '—';
    if(s.pickedUpAt && s.returnedAt) {
      // pickedUpAt/returnedAt are 12-hour clock strings like "11:28 AM"
      // (see toLocaleTimeString hour12 calls above). The old parser split on
      // ':' and Number()'d each half — the minutes half came out as e.g.
      // "30 AM", which is NaN, so every exported duration silently showed
      // "—" even when both timestamps were present. This also converts the
      // 12 AM/12 PM edge cases correctly (12 AM = 0h, 12 PM stays 12h).
      const parse = t => {
        const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
        if(!m) return NaN;
        let h = Number(m[1]) % 12;
        if(/PM/i.test(m[3])) h += 12;
        return h*60 + Number(m[2]);
      };
      const mins = parse(s.returnedAt) - parse(s.pickedUpAt);
      duration = Number.isFinite(mins) && mins > 0 ? `${Math.floor(mins/60)}h ${mins%60}m` : '—';
    }
    return [s.date, s.workerName, `S-${String(s.scannerNum).padStart(2,'0')}`, s.pickedUpAt||'—', s.returnedAt||'Not returned', duration];
  })];
  const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const rangeLabel = from&&to ? from+'_to_'+to : from ? 'from_'+from : to ? 'up_to_'+to : today();
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`scanner_log_${rangeLabel}.csv`});
  a.click(); URL.revokeObjectURL(a.href); showToast('Scanner log downloaded');
}

// ════════════════════════════════════════
// ---- REPORTS / COMPLAINTS ----
// ════════════════════════════════════════
let reports = [];
let reportFilter = 'all';
let reportsSubTab = 'issues';
let messages = [];
let reportsFirstLoad = true;
let prevReportMsgCounts = {};
let messagesFirstLoad = true;
let prevMessageKeys = new Set();
let batchReports = [];
let expiryReports = [];
let batchFormType = 'batch';
let batchAdminTab = 'batch';
let batchFilter = 'all';
let expiryFilter = 'all';
let batchFirstLoad = true;
let expiryFirstLoad = true;
let prevBatchKeys = new Set();
let prevExpiryKeys = new Set();


function updateReportsBadge() {
  const open = reports.filter(r => r.status === 'open').length;
  const b = document.getElementById('reports-subtab-issues-badge');
  if(b) { b.style.display = open > 0 ? 'inline' : 'none'; b.textContent = open; }
  updateMergedReportsBadge();
}

function updateMergedReportsBadge(){
  const openIssues = reports.filter(r=>r.status==='open').length;
  const pendingBatch = batchReports.filter(b=>b.status!=='uploaded').length + expiryReports.filter(x=>x.status!=='uploaded').length;
  const total = openIssues+pendingBatch;
  const b = document.getElementById('reports-count-badge');
  if(b) { b.style.display = total>0 ? 'inline' : 'none'; b.textContent = total; }
}

function setReportsSubTab(tab){
  reportsSubTab = tab;
  document.getElementById('reports-subtab-issues-content').style.display = tab==='issues'?'block':'none';
  document.getElementById('reports-subtab-batch-content').style.display = tab==='batch'?'block':'none';
  document.getElementById('reports-subtab-issues-btn').style.background = tab==='issues'?'var(--bg2)':'var(--bg)';
  document.getElementById('reports-subtab-issues-btn').style.fontWeight = tab==='issues'?'600':'500';
  document.getElementById('reports-subtab-batch-btn').style.background = tab==='batch'?'var(--bg2)':'var(--bg)';
  document.getElementById('reports-subtab-batch-btn').style.fontWeight = tab==='batch'?'600':'500';
  if(tab==='issues')renderReports();else renderBatchTab();
}

function submitReport() {
  const wName = document.getElementById('report-worker-name').value;
  const cat = document.getElementById('report-category').value;
  const desc = document.getElementById('report-description').value.trim();
  const scanNum = document.getElementById('report-scanner-num').value;
  if(!wName) { showToast('Please select your name'); return; }
  if(!cat) { showToast('Please select a category'); return; }
  if(!desc) { showToast('Please describe the issue'); return; }
  const catLabels = { scanner:'Scanner Issue / Damage', shipsy:'Shipsy WMS Issue', general:'General Warehouse Complaint' };
  const report = {
    workerName: wName, category: cat, categoryLabel: catLabels[cat],
    description: desc, scannerNum: scanNum || null,
    date: today(), time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}),
    status: 'open', resolvedAt: null, adminNote: null
  };
  wref('reports').push(report);
  document.getElementById('report-worker-name').value = '';
  document.getElementById('report-category').value = '';
  document.getElementById('report-description').value = '';
  document.getElementById('report-scanner-num').value = '';
  showToast('Report submitted — thank you');
}

function setReportFilter(f) {
  reportFilter = f;
  ['all','scanner','shipsy','general','open','resolved'].forEach(k => {
    const el = document.getElementById('rfilter-'+k);
    if(el) { el.style.background = f===k?'var(--bg2)':'var(--bg)'; el.style.fontWeight = f===k?'600':'500'; }
  });
  renderReports();
}

function updateReportStatus(fbKey, status, note) {
  wref('reports/'+fbKey).update({ status, adminNote: note||null, resolvedAt: status==='resolved'?new Date().toLocaleString('en-US',{hour12:true}):null });
  showToast(status === 'resolved' ? '✓ Marked as resolved' : 'Marked as in progress');
}

function escHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function playNotificationSound(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type='sine'; o.frequency.value=880;
    g.gain.setValueAtTime(0.16, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.35);
    o.start(); o.stop(ctx.currentTime+0.35);
  }catch(e){}
}

// ---- WORKER DEVICE IDENTITY (remembers whose phone this is, so we know who to notify) ----
function getMyWorkerName(){
  return localStorage.getItem(MY_WORKER_NAME_KEY) || '';
}
function setMyWorkerName(name){
  if(name) localStorage.setItem(MY_WORKER_NAME_KEY, name);
  else localStorage.removeItem(MY_WORKER_NAME_KEY);
}

// ---- BROWSER / OS NOTIFICATIONS ----
function notificationsSupported(){
  return 'Notification' in window;
}
function notificationsEnabled(){
  return notificationsSupported() && Notification.permission==='granted' && localStorage.getItem(NOTIF_ENABLED_KEY)==='true';
}
function requestNotificationPermission(){
  if(!notificationsSupported()){ showToast('Notifications are not supported on this device/browser'); return; }
  Notification.requestPermission().then(perm=>{
    if(perm==='granted'){ localStorage.setItem(NOTIF_ENABLED_KEY,'true'); showToast('🔔 Notifications enabled on this device'); }
    else { localStorage.setItem(NOTIF_ENABLED_KEY,'false'); showToast('Notifications blocked — enable them in your browser/phone settings'); }
    refreshNotifButtons();
  }).catch(()=>{ showToast('Could not enable notifications'); });
}
function refreshNotifButtons(){
  const on = notificationsEnabled();
  ['worker-notif-btn','admin-notif-btn'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = on ? '<i class="ti ti-bell-ringing"></i> Notifications on' : '<i class="ti ti-bell"></i> Enable notifications';
  });
}
function showBrowserNotification(title, body){
  if(!notificationsEnabled()) return;
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body, tag:'wh-msg', renotify:true}));
    } else {
      new Notification(title,{body});
    }
  }catch(e){}
}

function sendReportMessage(fbKey, sender, by, inputId){
  const el = document.getElementById(inputId);
  if(!el) return;
  const text = el.value.trim();
  if(!text) { showToast('Please type a message first'); return; }
  const payload = { sender, by, text, time: new Date().toLocaleString('en-US',{hour12:true}) };
  if(sender==='admin') payload.seenByWorker = false;
  if(sender==='worker') payload.seenByAdmin = false;
  wref('reports/'+fbKey+'/messages').push(payload);
  el.value='';
  showToast('Message sent');
}

function reportMessagesThreadHtml(r){
  const msgs = r.messages ? Object.values(r.messages).sort((a,b)=>(a.time||'').localeCompare(b.time||'')) : [];
  if(!msgs.length) return '';
  return `<div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:var(--bg2);border-radius:var(--radius)">
    ${msgs.map(m=>`
      <div style="align-self:${m.sender==='admin'?'flex-end':'flex-start'};max-width:85%">
        <div style="font-size:11px;color:var(--text2);margin-bottom:2px;text-align:${m.sender==='admin'?'right':'left'}">${escHtml(m.by)} · ${escHtml(m.time)}</div>
        <div style="font-size:13px;padding:8px 10px;border-radius:10px;line-height:1.5;background:${m.sender==='admin'?'var(--blue-bg)':'var(--bg)'};color:${m.sender==='admin'?'var(--blue-text)':'var(--text)'};border:0.5px solid var(--border2)">${escHtml(m.text)}</div>
      </div>`).join('')}
  </div>`;
}

function renderReports() {
  // Populate dropdowns
  const wOpts = '<option value="">— Select your name —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  const snOpts = '<option value="">— Not applicable —</option>' + Array.from({length:TOTAL_SCANNERS},(_,i)=>`<option value="${i+1}">Scanner ${i+1}</option>`).join('');
  ['report-worker-name'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML=wOpts; });
  const rsn = document.getElementById('report-scanner-num'); if(rsn) rsn.innerHTML = snOpts;
  const myOpts = '<option value="">— Select your name to view your reports —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  const myEl = document.getElementById('my-reports-name-select');
  if(myEl){ const cur=myEl.value; myEl.innerHTML=myOpts; if(cur)myEl.value=cur; }

  // Worker vs admin view
  const workerView = document.getElementById('reports-worker-view');
  const adminView = document.getElementById('reports-admin-view');
  if(currentAdmin) {
    if(workerView) workerView.style.display = 'none';
    if(adminView) adminView.style.display = 'block';
    renderAdminReports();
  } else {
    if(workerView) workerView.style.display = 'block';
    if(adminView) adminView.style.display = 'none';
    renderMyReports();
  }
}

let unlockedReportsName = null;

function renderMyReports(){
  const list = document.getElementById('my-reports-list');
  if(!list) return;
  const name = document.getElementById('my-reports-name-select')?.value || '';
  if(!name){ list.innerHTML=''; unlockedReportsName=null; return; }
  if(unlockedReportsName !== name){ renderReportsPinGate(name); return; }

  const catIcon = { scanner:'🔫', shipsy:'💻', general:'📋' };
  const statusColor = { open:'var(--red-text)', inprogress:'var(--amber-text)', resolved:'var(--green-text)' };
  const statusLabel = { open:'Open', inprogress:'In Progress', resolved:'Resolved' };
  const statusBg = { open:'var(--red-bg)', inprogress:'var(--amber-bg)', resolved:'var(--green-bg)' };
  const statusBorder = { open:'var(--red-border)', inprogress:'var(--amber-border)', resolved:'var(--green-border)' };

  const mine = reports.filter(r=>r.workerName===name).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  if(!mine.length){ list.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i>You have not submitted any reports yet</div>'; return; }

  list.innerHTML = mine.map(r => {
    const hasUnseen = r.messages && Object.values(r.messages).some(m=>m.sender==='admin' && m.seenByWorker===false);
    return `
    <div class="worker-card" style="flex-direction:column;align-items:stretch;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar senior" style="background:var(--bg2);color:var(--text2);font-size:20px">${catIcon[r.category]||'📋'}</div>
          <div>
            <div class="worker-name">${escHtml(r.categoryLabel)}${hasUnseen?' <span class="badge" style="background:var(--red-bg);color:var(--red-text);border:0.5px solid var(--red-border);font-size:10px;vertical-align:middle">● New reply</span>':''}</div>
            <div class="worker-meta">${escHtml(r.date)} ${escHtml(r.time)}${r.scannerNum?' · Scanner '+escHtml(r.scannerNum):''}</div>
          </div>
        </div>
        <span class="badge" style="background:${statusBg[r.status]};color:${statusColor[r.status]};border:0.5px solid ${statusBorder[r.status]}">${statusLabel[r.status]||'Open'}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);padding:10px 12px;background:var(--bg2);border-radius:var(--radius);line-height:1.6">${escHtml(r.description)}</div>
      ${r.status==='resolved' ? `<div style="font-size:12px;color:var(--green-text);padding:8px 12px;background:var(--green-bg);border-radius:var(--radius)"><i class="ti ti-circle-check"></i> Resolved on ${escHtml(r.resolvedAt||'')}</div>` : ''}
      ${r.adminNote ? `<div style="font-size:12px;color:var(--green-text);padding:8px 12px;background:var(--green-bg);border-radius:var(--radius)">Admin note: ${escHtml(r.adminNote)}</div>` : ''}
      ${reportMessagesThreadHtml(r)}
      <div style="display:flex;gap:8px">
        <input type="text" id="reply-input-${r.fbKey}" placeholder="Write a reply…" style="flex:1;padding:8px 10px;font-size:16px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg2);color:var(--text);outline:none">
        <button class="btn primary" style="font-size:12px" onclick="sendReportMessage('${r.fbKey}','worker','${escHtml(name).replace(/'/g,"\\'")}','reply-input-${r.fbKey}')"><i class="ti ti-send"></i></button>
      </div>
    </div>`;
  }).join('');

  // Mark admin replies as seen now that the (unlocked) owner is viewing them
  mine.forEach(r=>{
    if(!r.messages) return;
    Object.entries(r.messages).forEach(([k,m])=>{
      if(m.sender==='admin' && m.seenByWorker===false){
        wref('reports/'+r.fbKey+'/messages/'+k+'/seenByWorker').set(true);
      }
    });
  });
}

function renderReportsPinGate(name){
  const list = document.getElementById('my-reports-list');
  if(!list) return;
  const w = workers.find(x=>x.name===name);
  const hasPin = w && w.reportsPin;
  if(!hasPin){
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:24px 16px">
        <i class="ti ti-lock" style="font-size:30px;color:var(--text2)"></i>
        <p style="font-weight:600;margin:12px 0 4px">Protect your reports</p>
        <p style="font-size:13px;color:var(--text2);margin:0 auto 14px;max-width:280px">Create a 4-digit PIN so only you can view your reports and replies on this device.</p>
        <input type="password" inputmode="numeric" maxlength="4" id="reports-pin-new" placeholder="New PIN" style="text-align:center;letter-spacing:8px;font-size:18px;padding:10px;width:130px;margin:0 auto 8px;display:block;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg2);color:var(--text)">
        <input type="password" inputmode="numeric" maxlength="4" id="reports-pin-confirm" placeholder="Confirm PIN" style="text-align:center;letter-spacing:8px;font-size:18px;padding:10px;width:130px;margin:0 auto 12px;display:block;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg2);color:var(--text)">
        <p id="reports-pin-error" style="color:var(--red-text);font-size:12px;display:none;margin-bottom:8px"></p>
        <button class="btn primary" style="margin:0 auto" onclick="createReportsPin('${escHtml(name).replace(/'/g,"\\'")}')"><i class="ti ti-lock"></i> Set PIN &amp; continue</button>
      </div>`;
  } else {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:24px 16px">
        <i class="ti ti-lock" style="font-size:30px;color:var(--text2)"></i>
        <p style="font-weight:600;margin:12px 0 4px">Enter your PIN</p>
        <p style="font-size:13px;color:var(--text2);margin:0 auto 14px;max-width:280px">Your reports are locked. Enter your 4-digit PIN to view them.</p>
        <input type="password" inputmode="numeric" maxlength="4" id="reports-pin-enter" placeholder="PIN" style="text-align:center;letter-spacing:8px;font-size:18px;padding:10px;width:130px;margin:0 auto 12px;display:block;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg2);color:var(--text)" onkeydown="if(event.key==='Enter')verifyReportsPin('${escHtml(name).replace(/'/g,"\\'")}')">
        <p id="reports-pin-error-enter" style="color:var(--red-text);font-size:12px;display:none;margin-bottom:8px"></p>
        <button class="btn primary" style="margin:0 auto" onclick="verifyReportsPin('${escHtml(name).replace(/'/g,"\\'")}')"><i class="ti ti-lock-open"></i> Unlock</button>
        <p style="font-size:11px;color:var(--text2);margin-top:12px">Forgot your PIN? Ask an admin to reset it.</p>
      </div>`;
  }
}

function createReportsPin(name){
  const pin = document.getElementById('reports-pin-new').value.trim();
  const confirmPin = document.getElementById('reports-pin-confirm').value.trim();
  const err = document.getElementById('reports-pin-error');
  if(!/^\d{4}$/.test(pin)){ err.textContent='PIN must be exactly 4 digits'; err.style.display='block'; return; }
  if(pin !== confirmPin){ err.textContent='PINs do not match'; err.style.display='block'; return; }
  const w = workers.find(x=>x.name===name);
  if(!w){ err.textContent='Could not find your worker record'; err.style.display='block'; return; }
  wref('workers/'+w.fbKey+'/reportsPin').set(pin);
  unlockedReportsName = name;
  showToast('PIN set — your reports are now protected');
  renderMyReports();
}

function verifyReportsPin(name){
  const pin = document.getElementById('reports-pin-enter').value.trim();
  const err = document.getElementById('reports-pin-error-enter');
  const w = workers.find(x=>x.name===name);
  if(!w){ err.textContent='Could not find your worker record'; err.style.display='block'; return; }
  if(pin !== String(w.reportsPin)){ err.textContent='Incorrect PIN'; err.style.display='block'; document.getElementById('reports-pin-enter').value=''; return; }
  unlockedReportsName = name;
  renderMyReports();
}

function renderAdminReports() {
  const open = reports.filter(r=>r.status==='open').length;
  const inProg = reports.filter(r=>r.status==='inprogress').length;
  const resolved = reports.filter(r=>r.status==='resolved').length;
  const statsEl = document.getElementById('reports-stats');
  if(statsEl) statsEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">Open</div><div class="stat-value" style="color:var(--red-text)">${open}</div></div>` +
    `<div class="stat-card"><div class="stat-label">In Progress</div><div class="stat-value" style="color:var(--amber-text)">${inProg}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Resolved</div><div class="stat-value" style="color:var(--green-text)">${resolved}</div></div>`;

  let filtered = [...reports].sort((a,b)=>b.date.localeCompare(a.date));
  if(reportFilter==='scanner') filtered=filtered.filter(r=>r.category==='scanner');
  else if(reportFilter==='shipsy') filtered=filtered.filter(r=>r.category==='shipsy');
  else if(reportFilter==='general') filtered=filtered.filter(r=>r.category==='general');
  else if(reportFilter==='open') filtered=filtered.filter(r=>r.status==='open'||r.status==='inprogress');
  else if(reportFilter==='resolved') filtered=filtered.filter(r=>r.status==='resolved');

  const list = document.getElementById('reports-admin-list');
  if(!list) return;
  if(!filtered.length) { list.innerHTML='<div class="empty-state"><i class="ti ti-mood-happy"></i>No reports in this category</div>'; return; }

  const catIcon = { scanner:'🔫', shipsy:'💻', general:'📋' };
  const statusColor = { open:'var(--red-text)', inprogress:'var(--amber-text)', resolved:'var(--green-text)' };
  const statusLabel = { open:'Open', inprogress:'In Progress', resolved:'Resolved' };
  const statusBg = { open:'var(--red-bg)', inprogress:'var(--amber-bg)', resolved:'var(--green-bg)' };
  const statusBorder = { open:'var(--red-border)', inprogress:'var(--amber-border)', resolved:'var(--green-border)' };

  list.innerHTML = filtered.map(r => {
    const hasUnseen = r.messages && Object.values(r.messages).some(m=>m.sender==='worker' && m.seenByAdmin===false);
    return `
    <div class="worker-card" style="flex-direction:column;align-items:stretch;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar senior" style="background:var(--bg2);color:var(--text2);font-size:20px">${catIcon[r.category]||'📋'}</div>
          <div>
            <div class="worker-name">${r.workerName}${hasUnseen?' <span class="badge" style="background:var(--red-bg);color:var(--red-text);border:0.5px solid var(--red-border);font-size:10px;vertical-align:middle">● New reply</span>':''}</div>
            <div class="worker-meta">${r.categoryLabel} · ${r.date} ${r.time}${r.scannerNum?' · Scanner '+r.scannerNum:''}</div>
          </div>
        </div>
        <span class="badge" style="background:${statusBg[r.status]};color:${statusColor[r.status]};border:0.5px solid ${statusBorder[r.status]}">${statusLabel[r.status]||'Open'}</span>
      </div>
      <div style="font-size:13px;color:var(--text2);padding:10px 12px;background:var(--bg2);border-radius:var(--radius);line-height:1.6">${r.description}</div>
      ${r.status==='resolved' && r.resolvedAt ? `<div style="font-size:12px;color:var(--green-text);padding:8px 12px;background:var(--green-bg);border-radius:var(--radius)"><i class="ti ti-circle-check"></i> Resolved on ${r.resolvedAt}</div>` : ''}
      ${r.adminNote ? `<div style="font-size:12px;color:var(--green-text);padding:8px 12px;background:var(--green-bg);border-radius:var(--radius)">Admin note: ${r.adminNote}</div>` : ''}
      ${reportMessagesThreadHtml(r)}
      <div style="display:flex;gap:8px">
        <input type="text" id="admin-reply-input-${r.fbKey}" placeholder="Reply to ${escHtml(r.workerName)}…" style="flex:1;padding:8px 10px;font-size:16px;border:0.5px solid var(--border2);border-radius:var(--radius);background:var(--bg2);color:var(--text);outline:none">
        <button class="btn primary" style="font-size:12px" onclick="sendReportMessage('${r.fbKey}','admin','${escHtml(currentAdmin?.role||'Admin').replace(/'/g,"\\'")}','admin-reply-input-${r.fbKey}')"><i class="ti ti-send"></i></button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${r.status!=='inprogress'?`<button class="btn" onclick="updateReportStatus('${r.fbKey}','inprogress',null)" style="font-size:12px"><i class="ti ti-progress"></i> In Progress</button>`:''}
        ${r.status!=='resolved'?`<button class="btn success" onclick="resolveReport('${r.fbKey}')" style="font-size:12px"><i class="ti ti-check"></i> Resolve</button>`:''}
        ${r.status==='resolved'?`<button class="btn" onclick="updateReportStatus('${r.fbKey}','open',null)" style="font-size:12px"><i class="ti ti-refresh"></i> Reopen</button>`:''}
      </div>
    </div>`;
  }).join('');

  // Mark worker replies as seen now that admin is viewing the list
  filtered.forEach(r=>{
    if(!r.messages) return;
    Object.entries(r.messages).forEach(([k,m])=>{
      if(m.sender==='worker' && m.seenByAdmin===false){
        wref('reports/'+r.fbKey+'/messages/'+k+'/seenByAdmin').set(true);
      }
    });
  });

  // Set filter button styles
  ['all','scanner','shipsy','general','open','resolved'].forEach(k => {
    const el=document.getElementById('rfilter-'+k);
    if(el){el.style.background=reportFilter===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=reportFilter===k?'600':'500';}
  });
}

function resolveReport(fbKey) {
  const note = prompt('Optional: Add a resolution note (or press OK to skip)');
  updateReportStatus(fbKey, 'resolved', note||null);
}

// ════════════════════════════════════════
// ---- DIRECT MESSAGES (admin ↔ worker) ----
// ════════════════════════════════════════
function notifyNewReportMessage(r, m){
  if(currentAdmin){
    if(m.sender==='worker'){
      showToast('📩 New reply on "'+r.categoryLabel+'" from '+r.workerName);
      playNotificationSound();
      showBrowserNotification('New reply from '+r.workerName, r.categoryLabel);
    }
  } else {
    const selName = document.getElementById('my-reports-name-select')?.value || getMyWorkerName();
    if(m.sender==='admin' && r.workerName===selName){
      showToast('🔔 Admin replied to your report');
      playNotificationSound();
      showBrowserNotification('Message for '+selName, 'Admin replied to your report: '+r.categoryLabel);
    }
  }
}

function notifyNewDirectMessage(m){
  if(currentAdmin){
    if(m.sender==='worker'){
      showToast('💬 New message from '+m.with);
      playNotificationSound();
      showBrowserNotification('New message from '+m.with, m.text);
    }
  } else {
    const myName = getMyWorkerName();
    if(m.sender==='admin' && m.with===myName){
      showToast('🔔 New message from Admin');
      playNotificationSound();
      showBrowserNotification('Message for '+myName, m.text);
    }
  }
}
function updateMessagesBadge(){
  const b = document.getElementById('messages-count-badge');
  if(!b) return;
  let unread = 0;
  if(currentAdmin){
    unread = messages.filter(m=>m.sender==='worker' && !m.readByAdmin).length;
  } else {
    const myName = getMyWorkerName();
    if(myName) unread = messages.filter(m=>m.with===myName && m.sender==='admin' && !m.readByWorker).length;
  }
  b.style.display = unread>0 ? 'inline' : 'none';
  b.textContent = unread;
}

function messageThreadHtml(list){
  if(!list.length) return '<div class="empty-state" style="padding:20px"><i class="ti ti-message-2"></i>No messages yet — say hello</div>';
  return list.map(m=>`
    <div style="align-self:${m.sender==='admin'?'flex-end':'flex-start'};max-width:85%">
      <div style="font-size:11px;color:var(--text2);margin-bottom:2px;text-align:${m.sender==='admin'?'right':'left'}">${escHtml(m.by)} · ${escHtml(m.time)}</div>
      <div style="font-size:13px;padding:9px 11px;border-radius:10px;line-height:1.5;background:${m.sender==='admin'?'var(--blue-bg)':'var(--bg2)'};color:${m.sender==='admin'?'var(--blue-text)':'var(--text)'};border:0.5px solid var(--border2)">${escHtml(m.text)}</div>
    </div>`).join('');
}

function renderMessages(){
  const workerView = document.getElementById('messages-worker-view');
  const adminView = document.getElementById('messages-admin-view');
  if(currentAdmin){
    if(workerView) workerView.style.display='none';
    if(adminView) adminView.style.display='block';
    renderAdminMessages();
  } else {
    if(workerView) workerView.style.display='block';
    if(adminView) adminView.style.display='none';
    renderWorkerMessages();
  }
}

function renderWorkerMessages(){
  const wOpts = '<option value="">— Select your name —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  const sel = document.getElementById('msg-worker-name-select');
  if(sel){
    const cur=sel.value || getMyWorkerName();
    sel.innerHTML=wOpts;
    if(cur)sel.value=cur;
  }
  const name = sel ? sel.value : '';
  if(name) setMyWorkerName(name);
  refreshNotifButtons();
  const threadWrap = document.getElementById('msg-worker-thread-wrap');
  const empty = document.getElementById('msg-worker-empty');
  if(!name){ if(threadWrap)threadWrap.style.display='none'; if(empty)empty.style.display='flex'; return; }
  if(threadWrap)threadWrap.style.display='block';
  if(empty)empty.style.display='none';
  const thread = messages.filter(m=>m.with===name).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const unreadCount = thread.filter(m=>m.sender==='admin' && !m.readByWorker).length;
  const banner = unreadCount>0 ? `<div style="font-size:12px;color:var(--red-text);background:var(--red-bg);border:0.5px solid var(--red-border);border-radius:var(--radius);padding:6px 10px;margin-bottom:8px;text-align:center">🔔 ${unreadCount} new message${unreadCount>1?'s':''} from Admin</div>` : '';
  document.getElementById('msg-worker-thread').innerHTML = banner + messageThreadHtml(thread);
  const threadEl=document.getElementById('msg-worker-thread'); if(threadEl) threadEl.scrollTop = threadEl.scrollHeight;
  const unreadMsgs = thread.filter(m=>m.sender==='admin' && !m.readByWorker);
  if(unreadMsgs.length){
    unreadMsgs.forEach(m=>{ wref('messages/'+m.fbKey+'/readByWorker').set(true); });
    // Optimistically clear the top badge right away instead of waiting on the round-trip
    unreadMsgs.forEach(m=>{ m.readByWorker=true; });
    updateMessagesBadge();
  }
}

function sendWorkerMessage(){
  const name = document.getElementById('msg-worker-name-select').value;
  const text = document.getElementById('msg-worker-text').value.trim();
  if(!name){ showToast('Please select your name'); return; }
  if(!text){ showToast('Please type a message'); return; }
  setMyWorkerName(name);
  wref('messages').push({ with:name, sender:'worker', by:name, text, time:new Date().toLocaleString('en-US',{hour12:true}), readByAdmin:false, readByWorker:true });
  document.getElementById('msg-worker-text').value='';
  showToast('Message sent to admin');
}

function renderAdminMessages(){
  const wOpts = '<option value="">— Select a worker —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  const sel = document.getElementById('msg-admin-worker-select');
  if(sel){ const cur=sel.value; sel.innerHTML=wOpts; if(cur)sel.value=cur; }
  const name = sel ? sel.value : '';
  refreshNotifButtons();
  const threadWrap = document.getElementById('msg-admin-thread-wrap');
  const empty = document.getElementById('msg-admin-empty');
  if(!name){ if(threadWrap)threadWrap.style.display='none'; if(empty)empty.style.display='flex'; return; }
  if(threadWrap)threadWrap.style.display='block';
  if(empty)empty.style.display='none';
  const thread = messages.filter(m=>m.with===name).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  document.getElementById('msg-admin-thread').innerHTML = messageThreadHtml(thread);
  const threadEl=document.getElementById('msg-admin-thread'); if(threadEl) threadEl.scrollTop = threadEl.scrollHeight;
  // Mark worker's messages in this thread as read by admin
  const unreadMsgs = thread.filter(m=>m.sender==='worker' && !m.readByAdmin);
  if(unreadMsgs.length){
    unreadMsgs.forEach(m=>{ wref('messages/'+m.fbKey+'/readByAdmin').set(true); });
    // Optimistically clear the top badge right away instead of waiting on the round-trip
    unreadMsgs.forEach(m=>{ m.readByAdmin=true; });
    updateMessagesBadge();
  }
}

function sendAdminMessage(){
  const name = document.getElementById('msg-admin-worker-select').value;
  const text = document.getElementById('msg-admin-text').value.trim();
  if(!name){ showToast('Please pick a worker'); return; }
  if(!text){ showToast('Please type a message'); return; }
  wref('messages').push({ with:name, sender:'admin', by:currentAdmin?.role||'Admin', text, time:new Date().toLocaleString('en-US',{hour12:true}), readByAdmin:true, readByWorker:false });
  document.getElementById('msg-admin-text').value='';
  showToast('Message sent to '+name);
}

// ════════════════════════════════════════
// ---- BATCH REPORTS & EXPIRY CORRECTIONS ----
// ════════════════════════════════════════
function updateBatchBadge(){
  const pending = batchReports.filter(b=>b.status!=='uploaded').length + expiryReports.filter(x=>x.status!=='uploaded').length;
  const b = document.getElementById('reports-subtab-batch-badge');
  if(b){ b.style.display = pending>0 ? 'inline' : 'none'; b.textContent = pending; }
  updateMergedReportsBadge();
}

// Shared creators (used by the main tab AND the floating quick-report bubble)
function createBatchReportEntry(sku, newBatch, expiryDate, location, workerName){
  if(!workerName) return 'Please select your name';
  if(!sku || !newBatch || !expiryDate || !location) return 'Please fill in all fields';
  wref('batchReports').push({
    sku: sku.trim().toUpperCase(), newBatch: newBatch.trim(), expiryDate, location: location.trim(),
    workerName, status:'pending', date:today(), time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})
  });
  return null;
}
function createExpiryReportEntry(sku, batch, oldDate, correctDate, workerName){
  if(!workerName) return 'Please select your name';
  if(!sku || !batch || !oldDate || !correctDate) return 'Please fill in all fields';
  wref('expiryReports').push({
    sku: sku.trim().toUpperCase(), batch: batch.trim(), oldDate, correctDate,
    workerName, status:'pending', date:today(), time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})
  });
  return null;
}

function setBatchFormType(type){
  batchFormType = type;
  document.getElementById('batch-form-batch').style.display = type==='batch' ? 'block' : 'none';
  document.getElementById('batch-form-expiry').style.display = type==='expiry' ? 'block' : 'none';
  document.getElementById('batch-type-batch-btn').style.background = type==='batch' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('batch-type-batch-btn').style.fontWeight = type==='batch' ? '600' : '500';
  document.getElementById('batch-type-expiry-btn').style.background = type==='expiry' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('batch-type-expiry-btn').style.fontWeight = type==='expiry' ? '600' : '500';
  renderBatchRecentList();
}

function setBatchAdminTab(tab){
  batchAdminTab = tab;
  document.getElementById('batch-admin-panel-batch').style.display = tab==='batch' ? 'block' : 'none';
  document.getElementById('batch-admin-panel-expiry').style.display = tab==='expiry' ? 'block' : 'none';
  document.getElementById('batch-admin-tab-batch-btn').style.background = tab==='batch' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('batch-admin-tab-batch-btn').style.fontWeight = tab==='batch' ? '600' : '500';
  document.getElementById('batch-admin-tab-expiry-btn').style.background = tab==='expiry' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('batch-admin-tab-expiry-btn').style.fontWeight = tab==='expiry' ? '600' : '500';
}

function setBatchFilter(f){ batchFilter=f; renderBatchAdmin(); }
function setExpiryFilter(f){ expiryFilter=f; renderExpiryAdmin(); }

function renderBatchTab(){
  const wOpts = '<option value="">— Select your name —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  ['batch-worker-name','expiry-worker-name'].forEach(id=>{
    const el=document.getElementById(id); if(el){ const cur=el.value; el.innerHTML=wOpts; if(cur)el.value=cur; }
  });
  const workerView = document.getElementById('batch-worker-view');
  const adminView = document.getElementById('batch-admin-view');
  if(currentAdmin){
    if(workerView) workerView.style.display='none';
    if(adminView) adminView.style.display='block';
    renderBatchAdmin();
    renderExpiryAdmin();
  } else {
    if(workerView) workerView.style.display='block';
    if(adminView) adminView.style.display='none';
    setBatchFormType(batchFormType);
  }
}

function renderBatchRecentList(){
  const list = document.getElementById('batch-recent-list');
  if(!list) return;
  if(batchFormType==='batch'){
    const recent = [...batchReports].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,10);
    if(!recent.length){ list.innerHTML = '<div class="empty-state"><i class="ti ti-package"></i>No batches reported yet</div>'; return; }
    list.innerHTML = recent.map(b=>`
      <div class="worker-card">
        <div class="worker-left"><div class="avatar senior" style="background:var(--bg2);color:var(--text2)">📦</div>
          <div><div class="worker-name">${escHtml(b.sku)} · Batch ${escHtml(b.newBatch)}</div>
          <div class="worker-meta">Exp ${escHtml(b.expiryDate)} · ${escHtml(b.location)} · by ${escHtml(b.workerName)}</div></div>
        </div>
        <span class="badge" style="background:${b.status==='uploaded'?'var(--green-bg)':'var(--amber-bg)'};color:${b.status==='uploaded'?'var(--green-text)':'var(--amber-text)'};border:0.5px solid ${b.status==='uploaded'?'var(--green-border)':'var(--amber-border)'}">${b.status==='uploaded'?'Uploaded':'Pending'}</span>
      </div>`).join('');
  } else {
    const recent = [...expiryReports].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).slice(0,10);
    if(!recent.length){ list.innerHTML = '<div class="empty-state"><i class="ti ti-calendar-exclamation"></i>No corrections reported yet</div>'; return; }
    list.innerHTML = recent.map(x=>`
      <div class="worker-card">
        <div class="worker-left"><div class="avatar senior" style="background:var(--bg2);color:var(--text2)">📅</div>
          <div><div class="worker-name">${escHtml(x.sku)} · Batch ${escHtml(x.batch)}</div>
          <div class="worker-meta">${escHtml(x.oldDate)} → ${escHtml(x.correctDate)} · by ${escHtml(x.workerName)}</div></div>
        </div>
        <span class="badge" style="background:${x.status==='uploaded'?'var(--green-bg)':'var(--amber-bg)'};color:${x.status==='uploaded'?'var(--green-text)':'var(--amber-text)'};border:0.5px solid ${x.status==='uploaded'?'var(--green-border)':'var(--amber-border)'}">${x.status==='uploaded'?'Uploaded':'Pending'}</span>
      </div>`).join('');
  }
}

function submitBatchReport(){
  const workerName = document.getElementById('batch-worker-name').value;
  const sku = document.getElementById('batch-sku').value;
  const newBatch = document.getElementById('batch-new-batch').value;
  const expiryDate = document.getElementById('batch-expiry-date').value;
  const location = document.getElementById('batch-location').value;
  const err = document.getElementById('batch-report-error');
  const errMsg = createBatchReportEntry(sku, newBatch, expiryDate, location, workerName);
  if(errMsg){ if(err){err.textContent=errMsg;err.style.display='block';} return; }
  if(err) err.style.display='none';
  document.getElementById('batch-sku').value='';
  document.getElementById('batch-new-batch').value='';
  document.getElementById('batch-expiry-date').value='';
  document.getElementById('batch-location').value='';
  showToast('✓ Batch report submitted');
}

function submitExpiryReport(){
  const workerName = document.getElementById('expiry-worker-name').value;
  const sku = document.getElementById('expiry-sku').value;
  const batch = document.getElementById('expiry-batch').value;
  const oldDate = document.getElementById('expiry-old-date').value;
  const correctDate = document.getElementById('expiry-correct-date').value;
  const err = document.getElementById('expiry-report-error');
  const errMsg = createExpiryReportEntry(sku, batch, oldDate, correctDate, workerName);
  if(errMsg){ if(err){err.textContent=errMsg;err.style.display='block';} return; }
  if(err) err.style.display='none';
  document.getElementById('expiry-sku').value='';
  document.getElementById('expiry-batch').value='';
  document.getElementById('expiry-old-date').value='';
  document.getElementById('expiry-correct-date').value='';
  showToast('✓ Expiry correction submitted');
}

function renderBatchAdmin(){
  const statsEl = document.getElementById('batch-stats');
  const pending = batchReports.filter(b=>b.status!=='uploaded').length;
  const uploaded = batchReports.filter(b=>b.status==='uploaded').length;
  if(statsEl) statsEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--amber-text)">${pending}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Uploaded</div><div class="stat-value" style="color:var(--green-text)">${uploaded}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${batchReports.length}</div></div>`;

  let filtered = [...batchReports].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  if(batchFilter==='pending') filtered = filtered.filter(b=>b.status!=='uploaded');
  else if(batchFilter==='uploaded') filtered = filtered.filter(b=>b.status==='uploaded');

  const list = document.getElementById('batch-admin-list');
  if(!list) return;
  if(!filtered.length){ list.innerHTML = '<div class="empty-state"><i class="ti ti-package"></i>No batch reports in this view</div>'; return; }
  list.innerHTML = filtered.map(b => `
    <div class="worker-card">
      <div class="worker-left"><div class="avatar senior" style="background:var(--bg2);color:var(--text2)">📦</div>
        <div><div class="worker-name">${b.sku} · Batch ${b.newBatch}</div>
        <div class="worker-meta">Exp ${b.expiryDate} · ${b.location} · ${b.workerName} · ${b.date} ${b.time}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="badge" style="background:${b.status==='uploaded'?'var(--green-bg)':'var(--amber-bg)'};color:${b.status==='uploaded'?'var(--green-text)':'var(--amber-text)'};border:0.5px solid ${b.status==='uploaded'?'var(--green-border)':'var(--amber-border)'}">${b.status==='uploaded'?'Uploaded':'Pending'}</span>
        <button class="btn" title="${b.status==='uploaded'?'Mark as pending':'Mark as uploaded'}" onclick="toggleBatchStatus('${b.fbKey}')"><i class="ti ${b.status==='uploaded'?'ti-rotate':'ti-check'}"></i></button>
        <button class="btn danger" title="Delete" onclick="deleteBatchReport('${b.fbKey}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('');

  ['all','pending','uploaded'].forEach(k=>{
    const el=document.getElementById('bfilter-'+k);
    if(el){el.style.background=batchFilter===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=batchFilter===k?'600':'500';}
  });
}

function renderExpiryAdmin(){
  const statsEl = document.getElementById('expiry-stats');
  const pending = expiryReports.filter(x=>x.status!=='uploaded').length;
  const uploaded = expiryReports.filter(x=>x.status==='uploaded').length;
  if(statsEl) statsEl.innerHTML =
    `<div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--amber-text)">${pending}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Uploaded</div><div class="stat-value" style="color:var(--green-text)">${uploaded}</div></div>` +
    `<div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${expiryReports.length}</div></div>`;

  let filtered = [...expiryReports].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  if(expiryFilter==='pending') filtered = filtered.filter(x=>x.status!=='uploaded');
  else if(expiryFilter==='uploaded') filtered = filtered.filter(x=>x.status==='uploaded');

  const list = document.getElementById('expiry-admin-list');
  if(!list) return;
  if(!filtered.length){ list.innerHTML = '<div class="empty-state"><i class="ti ti-calendar-exclamation"></i>No expiry corrections in this view</div>'; return; }
  list.innerHTML = filtered.map(x => `
    <div class="worker-card">
      <div class="worker-left"><div class="avatar senior" style="background:var(--bg2);color:var(--text2)">📅</div>
        <div><div class="worker-name">${x.sku} · Batch ${x.batch}</div>
        <div class="worker-meta">${x.oldDate} → ${x.correctDate} · ${x.workerName} · ${x.date} ${x.time}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="badge" style="background:${x.status==='uploaded'?'var(--green-bg)':'var(--amber-bg)'};color:${x.status==='uploaded'?'var(--green-text)':'var(--amber-text)'};border:0.5px solid ${x.status==='uploaded'?'var(--green-border)':'var(--amber-border)'}">${x.status==='uploaded'?'Uploaded':'Pending'}</span>
        <button class="btn" title="${x.status==='uploaded'?'Mark as pending':'Mark as uploaded'}" onclick="toggleExpiryStatus('${x.fbKey}')"><i class="ti ${x.status==='uploaded'?'ti-rotate':'ti-check'}"></i></button>
        <button class="btn danger" title="Delete" onclick="deleteExpiryReport('${x.fbKey}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('');

  ['all','pending','uploaded'].forEach(k=>{
    const el=document.getElementById('efilter-'+k);
    if(el){el.style.background=expiryFilter===k?'var(--bg2)':'var(--bg)';el.style.fontWeight=expiryFilter===k?'600':'500';}
  });
}

function toggleBatchStatus(fbKey){
  const b = batchReports.find(x=>x.fbKey===fbKey); if(!b) return;
  wref('batchReports/'+fbKey+'/status').set(b.status==='uploaded'?'pending':'uploaded');
}
function toggleExpiryStatus(fbKey){
  const x = expiryReports.find(y=>y.fbKey===fbKey); if(!x) return;
  wref('expiryReports/'+fbKey+'/status').set(x.status==='uploaded'?'pending':'uploaded');
}
function deleteBatchReport(fbKey){
  if(!confirm('Delete this batch report?')) return;
  wref('batchReports/'+fbKey).remove();
}
function deleteExpiryReport(fbKey){
  if(!confirm('Delete this expiry correction?')) return;
  wref('expiryReports/'+fbKey).remove();
}
function markAllBatchUploaded(){
  const pending = batchReports.filter(b=>b.status!=='uploaded');
  if(!pending.length){ showToast('Nothing pending'); return; }
  if(!confirm('Mark all '+pending.length+' pending batch reports as uploaded?')) return;
  pending.forEach(b=>wref('batchReports/'+b.fbKey+'/status').set('uploaded'));
  showToast('Marked '+pending.length+' as uploaded');
}
function markAllExpiryUploaded(){
  const pending = expiryReports.filter(x=>x.status!=='uploaded');
  if(!pending.length){ showToast('Nothing pending'); return; }
  if(!confirm('Mark all '+pending.length+' pending expiry corrections as uploaded?')) return;
  pending.forEach(x=>wref('expiryReports/'+x.fbKey+'/status').set('uploaded'));
  showToast('Marked '+pending.length+' as uploaded');
}

function downloadBatchExcel(){
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  let rows = [...batchReports];
  if(batchFilter==='pending') rows = rows.filter(b=>b.status!=='uploaded');
  else if(batchFilter==='uploaded') rows = rows.filter(b=>b.status==='uploaded');
  const from=(document.getElementById('batch-filter-from')||{value:''}).value;
  const to=(document.getElementById('batch-filter-to')||{value:''}).value;
  if(from) rows = rows.filter(b=>b.date>=from);
  if(to) rows = rows.filter(b=>b.date<=to);
  if(!rows.length){ showToast('No batch reports to export in this range'); return; }
  const data = rows.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(b=>({
    'SKU Code': b.sku, 'New Batch': b.newBatch, 'Expiry Date': b.expiryDate, 'Location': b.location,
    'Reported By': b.workerName, 'Date': b.date, 'Time': b.time, 'Status': b.status==='uploaded'?'Uploaded':'Pending'
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Batch Reports');
  XLSX.writeFile(wb, 'batch_reports_'+(from&&to?from+'_to_'+to:from?'from_'+from:to?'up_to_'+to:today())+'.xlsx');
  showToast('Excel file downloaded');
}
function downloadExpiryExcel(){
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  let rows = [...expiryReports];
  if(expiryFilter==='pending') rows = rows.filter(x=>x.status!=='uploaded');
  else if(expiryFilter==='uploaded') rows = rows.filter(x=>x.status==='uploaded');
  const from=(document.getElementById('expiry-filter-from')||{value:''}).value;
  const to=(document.getElementById('expiry-filter-to')||{value:''}).value;
  if(from) rows = rows.filter(x=>x.date>=from);
  if(to) rows = rows.filter(x=>x.date<=to);
  if(!rows.length){ showToast('No expiry corrections to export in this range'); return; }
  const data = rows.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(x=>({
    'SKU Code': x.sku, 'Correct Date': x.correctDate, 'Old Date': x.oldDate, 'Batch': x.batch,
    'Reported By': x.workerName, 'Date': x.date, 'Time': x.time, 'Status': x.status==='uploaded'?'Uploaded':'Pending'
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expiry Corrections');
  XLSX.writeFile(wb, 'expiry_corrections_'+(from&&to?from+'_to_'+to:from?'from_'+from:to?'up_to_'+to:today())+'.xlsx');
  showToast('Excel file downloaded');
}

// ════════════════════════════════════════
// ---- FLOATING QUICK-REPORT BUBBLE ----
// ════════════════════════════════════════
const QR_BUBBLE_HIDDEN_KEY = 'qrBubbleHidden';
const QR_BUBBLE_POS_KEY = 'qrBubblePos';
let qrBubbleHidden = localStorage.getItem(QR_BUBBLE_HIDDEN_KEY)==='true';
let qrType = 'batch';
let qrDragging = false;

function renderBubbleVisibility(){
  const b = document.getElementById('quick-report-bubble');
  if(!b) return;
  b.style.display = (!qrBubbleHidden && !currentAdmin) ? 'block' : 'none';
  const t = document.getElementById('bubble-toggle');
  if(t) t.className = 'toggle'+(qrBubbleHidden?'':' on');
}

function initQrBubble(){
  const bubble = document.getElementById('quick-report-bubble');
  if(!bubble) return;
  // Restore saved position (default: bottom-right)
  const savedPos = JSON.parse(localStorage.getItem(QR_BUBBLE_POS_KEY) || 'null');
  const defaultX = window.innerWidth - 76;
  const defaultY = window.innerHeight - 140;
  let x = savedPos ? savedPos.x : defaultX;
  let y = savedPos ? savedPos.y : defaultY;
  x = Math.max(4, Math.min(x, window.innerWidth - 56));
  y = Math.max(4, Math.min(y, window.innerHeight - 56));
  bubble.style.left = x+'px';
  bubble.style.top = y+'px';

  let startX, startY, origX, origY, moved;
  const handle = document.getElementById('qr-bubble-handle');

  function onDown(e){
    qrDragging = true; moved = false;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    origX = bubble.offsetLeft; origY = bubble.offsetTop;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
  }
  function onMove(e){
    if(!qrDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - startX, dy = pt.clientY - startY;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) moved = true;
    if(moved && e.cancelable) e.preventDefault();
    let nx = origX + dx, ny = origY + dy;
    nx = Math.max(4, Math.min(nx, window.innerWidth - 56));
    ny = Math.max(4, Math.min(ny, window.innerHeight - 56));
    bubble.style.left = nx+'px';
    bubble.style.top = ny+'px';
  }
  function onUp(){
    qrDragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    localStorage.setItem(QR_BUBBLE_POS_KEY, JSON.stringify({x: bubble.offsetLeft, y: bubble.offsetTop}));
    if(!moved) openQrPanel();
  }
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, {passive:true});

  document.getElementById('qr-bubble-close').addEventListener('click', (e)=>{
    e.stopPropagation();
    qrBubbleHidden = true;
    localStorage.setItem(QR_BUBBLE_HIDDEN_KEY,'true');
    renderBubbleVisibility();
    showToast('Quick Report bubble hidden — an admin can bring it back from Sheets settings');
  });

  renderBubbleVisibility();
}

function toggleQuickReportBubble(){
  qrBubbleHidden = !qrBubbleHidden;
  localStorage.setItem(QR_BUBBLE_HIDDEN_KEY, qrBubbleHidden?'true':'false');
  renderBubbleVisibility();
}

function openQrPanel(){
  const wOpts = '<option value="">— Your name —</option>' + workers.map(w=>`<option value="${w.name}">${w.name}</option>`).join('');
  ['qr-worker-name','qr-expiry-worker-name'].forEach(id=>{
    const el=document.getElementById(id); if(el){ const cur=el.value; el.innerHTML=wOpts; if(cur)el.value=cur; }
  });
  document.getElementById('qr-panel-overlay').classList.remove('hidden');
  setQrType(qrType);
}
function closeQrPanel(){
  document.getElementById('qr-panel-overlay').classList.add('hidden');
}
function setQrType(type){
  qrType = type;
  document.getElementById('qr-form-batch').style.display = type==='batch' ? 'block' : 'none';
  document.getElementById('qr-form-expiry').style.display = type==='expiry' ? 'block' : 'none';
  document.getElementById('qr-type-batch-btn').style.background = type==='batch' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('qr-type-batch-btn').style.fontWeight = type==='batch' ? '600' : '500';
  document.getElementById('qr-type-expiry-btn').style.background = type==='expiry' ? 'var(--bg2)' : 'var(--bg)';
  document.getElementById('qr-type-expiry-btn').style.fontWeight = type==='expiry' ? '600' : '500';
  document.getElementById('qr-confirm').style.display='none';
}
function qrFlashConfirm(){
  const c = document.getElementById('qr-confirm');
  c.style.display='block';
  clearTimeout(window._qrConfirmTimeout);
  window._qrConfirmTimeout = setTimeout(()=>{ c.style.display='none'; }, 2500);
}
function qrSubmitBatch(){
  const workerName = document.getElementById('qr-worker-name').value;
  const sku = document.getElementById('qr-sku').value;
  const newBatch = document.getElementById('qr-new-batch').value;
  const expiryDate = document.getElementById('qr-expiry-date').value;
  const location = document.getElementById('qr-location').value;
  const errMsg = createBatchReportEntry(sku, newBatch, expiryDate, location, workerName);
  if(errMsg){ showToast(errMsg); return; }
  document.getElementById('qr-sku').value='';
  document.getElementById('qr-new-batch').value='';
  document.getElementById('qr-expiry-date').value='';
  document.getElementById('qr-location').value='';
  qrFlashConfirm();
}
function qrSubmitExpiry(){
  const workerName = document.getElementById('qr-expiry-worker-name').value;
  const sku = document.getElementById('qr-e-sku').value;
  const batch = document.getElementById('qr-e-batch').value;
  const oldDate = document.getElementById('qr-old-date').value;
  const correctDate = document.getElementById('qr-correct-date').value;
  const errMsg = createExpiryReportEntry(sku, batch, oldDate, correctDate, workerName);
  if(errMsg){ showToast(errMsg); return; }
  document.getElementById('qr-e-sku').value='';
  document.getElementById('qr-e-batch').value='';
  document.getElementById('qr-old-date').value='';
  document.getElementById('qr-correct-date').value='';
  qrFlashConfirm();
}

// ════════════════════════════════════════
// ---- PRODUCTION LOGGING (picking, packing, replenishment, putaway) ----
// ════════════════════════════════════════
function getTaskType(p){ return p.taskType || 'picking'; } // legacy entries had no taskType — treat as picking
function getWorkerTodayProduction(workerId){
  return production.filter(p=>p.workerId===workerId && p.date===today());
}

function openProductionModal(workerId){
  pendingProductionWorkerId = workerId;
  pendingEditFbKey = null;
  clearProductionForm();
  const w = workers.find(x=>x.id===workerId);
  document.getElementById('production-modal-title').textContent = 'Log work — ' + (w ? w.name : '');
  document.getElementById('production-edit-banner').style.display = 'none';
  document.querySelectorAll('#production-type-tabs .task-type-btn').forEach(b=>{ b.disabled=false; b.style.opacity=''; b.style.pointerEvents=''; });
  document.getElementById('production-submit-btn').innerHTML = '<i class="ti ti-plus"></i> Add entry';
  setProductionType('picking');
  document.getElementById('production-modal').classList.remove('hidden');
}

function clearProductionForm(){
  document.getElementById('production-orders-input').value = '';
  document.getElementById('production-skus-input').value = '';
  document.getElementById('production-customer-input').value = '';
  document.getElementById('production-weight-input').value = '';
  document.getElementById('production-cartons-input').value = '';
  document.getElementById('production-qty-input').value = '';
  document.getElementById('production-location-input').value = '';
  document.getElementById('production-error').style.display = 'none';
  const search = document.getElementById('production-pack-order-search'); if(search) search.value = '';
  const selGroup = document.getElementById('production-pack-order-group'); if(selGroup) selGroup.style.display = '';
  const manualWrap = document.getElementById('production-pack-manual-wrap'); if(manualWrap) manualWrap.style.display = 'none';
  const manualLabel = document.getElementById('pack-manual-toggle-label'); if(manualLabel) manualLabel.textContent = "Can't find it? Enter customer manually";
  pendingProductionMarket = null; pendingProductionOrderId = null; pendingProductionMatchedName = null;
  resetPutawayUI();
}

function closeProductionModal(){
  document.getElementById('production-modal').classList.add('hidden');
  pendingProductionWorkerId = null;
  pendingEditFbKey = null;
  resetPutawayUI();
}

function setProductionType(type){
  pendingProductionType = type;
  document.querySelectorAll('#production-type-tabs .task-type-btn').forEach(b=>{
    b.classList.toggle('primary', b.dataset.type===type);
  });
  const showOrders = (type==='picking' || type==='packing');
  document.getElementById('production-fields-orders').style.display = showOrders ? 'flex' : 'none';
  document.getElementById('production-fields-packing-order').style.display = type==='packing' ? 'block' : 'none';
  document.getElementById('production-fields-packing-weight').style.display = type==='packing' ? 'flex' : 'none';
  document.getElementById('production-fields-qty').style.display = type==='replenishment' ? 'flex' : 'none';
  document.getElementById('production-fields-putaway').style.display = type==='putaway' ? 'block' : 'none';
  document.getElementById('production-type-hint').style.display = type==='packing' ? 'block' : 'none';
  // Packing is always tied to one selected order (or one manually-entered
  // customer) per batch, so "Orders in this batch" is redundant there — hide
  // it and default the value to 1. Picking still needs it since a lot of
  // picking isn't tied to a specific system-tracked order.
  const ordersFieldGroup = document.getElementById('production-orders-field-group');
  if(ordersFieldGroup) ordersFieldGroup.style.display = type==='packing' ? 'none' : 'flex';
  const ordersInput = document.getElementById('production-orders-input');
  if(ordersInput && type==='packing' && !pendingEditFbKey) ordersInput.value = '1';
  // Putaway logs itself via the Start/End buttons, not the generic "Add
  // entry" button — except when editing an already-completed entry, where
  // there's nothing left to time and a plain save makes more sense.
  const submitBtn = document.getElementById('production-submit-btn');
  if(submitBtn) submitBtn.style.display = (type==='putaway' && !pendingEditFbKey) ? 'none' : 'flex';
  if(type==='putaway'){
    populateSupplierDropdown();
    if(!pendingEditFbKey) syncPutawayUIFromFirebase();
  }
  const err = document.getElementById('production-error'); if(err) err.style.display = 'none';
  renderProductionModal();
}

function editProductionEntry(fbKey){
  const e = production.find(p=>p.fbKey===fbKey);
  if(!e) return;
  pendingEditFbKey = fbKey;
  pendingProductionMarket = null; pendingProductionOrderId = null; pendingProductionMatchedName = null;
  const type = getTaskType(e);
  document.querySelectorAll('#production-type-tabs .task-type-btn').forEach(b=>{ b.disabled=true; b.style.opacity='0.5'; b.style.pointerEvents='none'; });
  setProductionType(type);
  if(type==='picking' || type==='packing'){
    document.getElementById('production-orders-input').value = e.orders||'';
    document.getElementById('production-skus-input').value = e.skus||'';
    if(type==='packing'){
      // Editing an existing entry doesn't map to picking a fresh order off the
      // search list — hide it and show only the manual field, pre-filled with
      // the saved customer, so the two controls don't sit on screen at once.
      const selGroup = document.getElementById('production-pack-order-group');
      if(selGroup) selGroup.style.display = 'none';
      const manualWrap = document.getElementById('production-pack-manual-wrap');
      if(manualWrap) manualWrap.style.display = 'flex';
      const search = document.getElementById('production-pack-order-search'); if(search) search.value = '';
      document.getElementById('production-customer-input').value = e.customer||'';
      document.getElementById('production-weight-input').value = e.weight||'';
      document.getElementById('production-cartons-input').value = e.cartons||'';
    }
  } else if(type==='putaway'){
    // Editing a finished putaway entry just corrects supplier/qty — the
    // original Start→End timing already happened and stays untouched.
    populateSupplierDropdown();
    document.getElementById('production-supplier-input').value = e.supplier||'';
    document.getElementById('production-putaway-qty-input').value = e.qty||'';
    document.getElementById('putaway-start-btn').style.display = 'none';
    document.getElementById('putaway-end-btn').style.display = 'none';
    document.getElementById('putaway-cancel-btn').style.display = 'none';
    document.getElementById('putaway-timer-row').style.display = 'none';
  } else {
    document.getElementById('production-qty-input').value = e.qty||'';
    document.getElementById('production-location-input').value = e.location||'';
  }
  document.getElementById('production-edit-banner').style.display = 'flex';
  document.getElementById('production-submit-btn').innerHTML = '<i class="ti ti-check"></i> Save changes';
  document.getElementById('production-error').style.display = 'none';
}

function cancelEditProduction(){
  pendingEditFbKey = null;
  document.querySelectorAll('#production-type-tabs .task-type-btn').forEach(b=>{ b.disabled=false; b.style.opacity=''; b.style.pointerEvents=''; });
  document.getElementById('production-edit-banner').style.display = 'none';
  document.getElementById('production-submit-btn').innerHTML = '<i class="ti ti-plus"></i> Add entry';
  clearProductionForm();
  setProductionType(pendingProductionType);
}

function addProductionEntry(){
  const type = pendingProductionType || 'picking';
  const err = document.getElementById('production-error');
  const w = workers.find(x=>x.id===pendingProductionWorkerId);
  if(!w) return;
  const isEdit = !!pendingEditFbKey;
  const ci = getCheckinState(w.id);
  const now = new Date();
  const entry = isEdit ? {} : {
    workerId: w.id,
    workerName: w.name,
    date: today(),
    shift: ci ? (ci.shift || null) : null,
    taskType: type,
    time: now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}),
    createdAt: now.toISOString()
  };
  let toastMsg = '';
  // The Firebase write itself (set below in each branch) and a matching
  // afterSave() cleanup callback — field-clearing, closing the edit view,
  // and the "saved" toast only ever run once Firebase has actually
  // confirmed the write. Previously these ran unconditionally right after
  // firing the write, so a dropped connection (common on the warehouse
  // floor) would silently fail to save while the UI still cleared the form
  // and said "saved" — the entry was gone and the worker had to redo it
  // with no idea anything had gone wrong.
  let writePromise = null;
  let afterSave = ()=>{};

  if(type==='picking' || type==='packing'){
    const skus = parseInt(document.getElementById('production-skus-input').value, 10);
    const skusOk = Number.isFinite(skus) && skus >= 0;
    // Packing's "Orders in this batch" field is hidden from view (a packed
    // batch is always exactly one order) — don't depend on that hidden
    // field's live DOM value at submit time, since any stale state there
    // would silently fail validation even with a perfectly valid SKU count.
    // Picking still supports multi-order batches, so it keeps reading the
    // (visible) field.
    const orderCount = type==='packing' ? 1 : parseInt(document.getElementById('production-orders-input').value, 10);
    const ordersOk = Number.isFinite(orderCount) && orderCount >= 0;
    if(!ordersOk || !skusOk || (orderCount===0 && skus===0)){
      err.textContent = 'Enter a valid number of orders and/or SKUs';
      err.style.display = 'block';
      return;
    }
    entry.orders = orderCount; entry.skus = skus;
    if(type==='packing'){
      const customer = document.getElementById('production-customer-input').value.trim();
      const weight = parseFloat(document.getElementById('production-weight-input').value);
      const cartons = parseInt(document.getElementById('production-cartons-input').value, 10);
      if(!customer){
        err.textContent = 'Enter the customer name for this packed order';
        err.style.display = 'block';
        return;
      }
      entry.customer = customer;
      entry.weight = Number.isFinite(weight) && weight >= 0 ? weight : 0;
      entry.cartons = Number.isFinite(cartons) && cartons >= 0 ? cartons : 0;
      if(pendingProductionMarket && pendingProductionMatchedName===customer.trim().toLowerCase()){
        entry.marketRegion = pendingProductionMarket;
      }
      if(!isEdit) entry.readyForDispatchAt = now.toISOString();
      toastMsg = (isEdit?'Entry updated — ':'Packed ')+orderCount+' orders / '+skus+' SKUs for '+customer+(isEdit?'':' — ready for dispatch at '+entry.time);
    } else {
      toastMsg = isEdit ? 'Entry updated' : 'Entry added — '+orderCount+' orders, '+skus+' SKUs';
    }
    err.style.display = 'none';
    writePromise = isEdit ? wref('production/'+pendingEditFbKey).update(entry) : wref('production').push(entry);
    afterSave = ()=>{
      if(type==='packing' && !isEdit){
        // Close out the order this batch packed. If the packer didn't pick an
        // order from the list, fall back to the oldest picked-but-unpacked order
        // for the same customer — without this, those orders stayed 'picked'
        // forever, so "Pending packing" and "Picked, not packed" kept counting
        // work that was already packed and dispatched. This now only runs
        // after the production entry itself is confirmed saved, so a failed
        // write can't leave an order marked "packed" with no matching entry.
        let orderKey = pendingProductionOrderId;
        if(!orderKey){
          const cust = (entry.customer||'').trim().toLowerCase();
          const match = cust ? getReadyToPackOrders().find(o=>(o.customer||'').trim().toLowerCase()===cust) : null;
          if(match) orderKey = match.fbKey;
        }
        if(orderKey) wref('orders/'+orderKey).update({status:'packed', packedAt: now.toISOString()});
      }
      pendingProductionMarket=null; pendingProductionOrderId=null; pendingProductionMatchedName=null;
      document.getElementById('production-orders-input').value = '';
      document.getElementById('production-skus-input').value = '';
      document.getElementById('production-customer-input').value = '';
      document.getElementById('production-weight-input').value = '';
      document.getElementById('production-cartons-input').value = '';
      // Without this, the search box from the just-packed order stays typed in —
      // so packing a second order right after would show "No match" (or a
      // stale, now-wrong filtered list) instead of the full remaining list,
      // even though there's nothing actually wrong. Reset it so the next entry
      // starts from a clean, unfiltered list like every other field does.
      if(type==='packing' && !isEdit){
        const search = document.getElementById('production-pack-order-search'); if(search) search.value = '';
        renderPackOrderList();
      }
    };
  } else if(type==='putaway'){
    // New putaway entries are created via startPutawayTask()/endPutawayTask()
    // instead — this branch only runs when editing an already-completed entry
    // (original Start→End timing is preserved, only supplier/qty change here).
    if(!isEdit) return;
    const supplier = document.getElementById('production-supplier-input').value.trim();
    const qty = parseInt(document.getElementById('production-putaway-qty-input').value, 10);
    if(!supplier){
      err.textContent = 'Select a supplier';
      err.style.display = 'block';
      return;
    }
    if(!Number.isFinite(qty) || qty<=0){
      err.textContent = 'Enter a valid quantity supplied';
      err.style.display = 'block';
      return;
    }
    err.style.display = 'none';
    entry.supplier = supplier;
    entry.qty = qty;
    writePromise = wref('production/'+pendingEditFbKey).update(entry);
    toastMsg = 'Entry updated';
    afterSave = ()=>{ document.getElementById('production-putaway-qty-input').value = ''; };
  } else {
    const qty = parseInt(document.getElementById('production-qty-input').value, 10);
    const qtyOk = Number.isFinite(qty) && qty >= 0;
    if(!qtyOk || qty===0){
      err.textContent = 'Enter a valid quantity';
      err.style.display = 'block';
      return;
    }
    err.style.display = 'none';
    entry.qty = qty;
    const loc = document.getElementById('production-location-input').value.trim();
    entry.location = loc || null;
    writePromise = isEdit ? wref('production/'+pendingEditFbKey).update(entry) : wref('production').push(entry);
    toastMsg = (isEdit?'Entry updated — ':'')+qty+' units logged for '+PRODUCTION_TYPES[type].label.toLowerCase()+(loc?' at '+loc:'');
    afterSave = ()=>{
      document.getElementById('production-qty-input').value = '';
      document.getElementById('production-location-input').value = '';
    };
  }

  const submitBtn = document.getElementById('production-submit-btn');
  if(submitBtn){ submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
  writePromise.then(()=>{
    if(submitBtn){ submitBtn.disabled = false; submitBtn.style.opacity = ''; }
    afterSave();
    if(isEdit) cancelEditProduction();
    showToast(toastMsg);
  }).catch(e=>{
    console.error('Failed to save production entry', e);
    if(submitBtn){ submitBtn.disabled = false; submitBtn.style.opacity = ''; }
    // Deliberately do NOT clear the form or close the edit view here — the
    // worker's entered values stay exactly as typed so they can just hit
    // "Add entry" again instead of redoing everything from scratch.
    err.textContent = "Couldn't save — check your connection and try again";
    err.style.display = 'block';
    showToast("Save failed — check your connection and try again");
  });
}

// ---- PUTAWAY (supplier + qty, timed with an explicit Start/End) ----
// The in-progress session (supplier + start time) lives in Firebase at
// putawayInProgress/<workerId>, not just a local variable — see the
// putawayInProgress listener in loadWarehouseData(). That's what lets a
// closed tab, locked phone, or crash mid-task recover the running timer
// instead of losing it: reopening the Putaway tab for that worker calls
// syncPutawayUIFromFirebase(), which reads the persisted session (if any)
// straight from `putawayInProgress` and rebuilds the UI around it.
function populateSupplierDropdown(){
  const sel = document.getElementById('production-supplier-input');
  if(!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Select supplier…</option>' + SUPPLIER_LIST.map(n=>'<option value="'+escHtml(n)+'">'+escHtml(n)+'</option>').join('');
  if(current) sel.value = current;
}
// Blank-slate DOM reset — does NOT touch Firebase. Safe to call any time the
// Putaway fields should just show empty/ready-to-start (e.g. opening the
// modal fresh, or confirmed via syncPutawayUIFromFirebase that there's no
// session for this worker).
function resetPutawayUI(){
  const supplierSel = document.getElementById('production-supplier-input'); if(supplierSel){ supplierSel.value=''; supplierSel.disabled=false; }
  const qtyInput = document.getElementById('production-putaway-qty-input'); if(qtyInput) qtyInput.value='';
  const startBtn = document.getElementById('putaway-start-btn'); if(startBtn) startBtn.style.display='flex';
  const endBtn = document.getElementById('putaway-end-btn'); if(endBtn) endBtn.style.display='none';
  const cancelBtn = document.getElementById('putaway-cancel-btn'); if(cancelBtn) cancelBtn.style.display='none';
  const timerRow = document.getElementById('putaway-timer-row'); if(timerRow) timerRow.style.display='none';
}
// Reads putawayInProgress (kept in sync by the Firebase listener) for the
// worker whose modal is currently open, and makes the UI match reality:
// running timer if they already pressed Start (on this device or another
// one), blank/ready-to-start otherwise. Called whenever the Putaway tab is
// opened and whenever the underlying Firebase data changes.
function syncPutawayUIFromFirebase(){
  const w = workers.find(x=>x.id===pendingProductionWorkerId);
  const session = w ? putawayInProgress[w.id] : null;
  if(!session){ resetPutawayUI(); return; }
  const supplierSel = document.getElementById('production-supplier-input');
  if(supplierSel){ supplierSel.value = session.supplier; supplierSel.disabled = true; }
  document.getElementById('putaway-start-btn').style.display = 'none';
  document.getElementById('putaway-end-btn').style.display = 'flex';
  const cancelBtn = document.getElementById('putaway-cancel-btn'); if(cancelBtn) cancelBtn.style.display = 'flex';
  const timerRow = document.getElementById('putaway-timer-row'); timerRow.style.display = 'flex';
  const span = document.getElementById('putaway-timer-span');
  span.dataset.assignedAt = session.startedAt;
  span.textContent = elapsedLabel(session.startedAt);
}
function startPutawayTask(){
  const supplierSel = document.getElementById('production-supplier-input');
  const supplier = supplierSel ? supplierSel.value : '';
  if(!supplier){ showToast('Select a supplier first'); return; }
  const w = workers.find(x=>x.id===pendingProductionWorkerId); if(!w) return;
  wref('putawayInProgress/'+w.id).set({supplier, workerName:w.name, startedAt:new Date().toISOString()});
  showToast('Started putaway for '+supplier);
  // The listener will also call syncPutawayUIFromFirebase() once Firebase
  // confirms the write, but updating now avoids waiting on the round-trip.
  syncPutawayUIFromFirebase();
}
// Discards an in-progress session without logging anything — e.g. the wrong
// supplier was picked. Nothing was ever written to `production`, so there's
// nothing to undo there; this just clears the persisted session.
function cancelPutawayTask(){
  const w = workers.find(x=>x.id===pendingProductionWorkerId); if(!w) return;
  if(!confirm('Discard this putaway session? Nothing has been logged yet.')) return;
  wref('putawayInProgress/'+w.id).remove();
  resetPutawayUI();
}
function endPutawayTask(){
  const w = workers.find(x=>x.id===pendingProductionWorkerId); if(!w) return;
  const session = putawayInProgress[w.id];
  if(!session){ showToast('Press Start first'); return; }
  const qty = parseInt(document.getElementById('production-putaway-qty-input').value, 10);
  if(!Number.isFinite(qty) || qty<=0){ showToast('Enter the quantity supplied'); return; }
  const now = new Date();
  const ci = getCheckinState(w.id);
  const durationMinutes = Math.max(0, Math.round((now.getTime()-new Date(session.startedAt).getTime())/60000));
  wref('production').push({
    workerId:w.id, workerName:w.name, date:today(), shift: ci?(ci.shift||null):null,
    taskType:'putaway', supplier:session.supplier, qty,
    startedAt:session.startedAt, doneAt:now.toISOString(), durationMinutes,
    time: now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}), createdAt: now.toISOString()
  });
  wref('putawayInProgress/'+w.id).remove();
  showToast(qty+' units put away for '+session.supplier+' ('+durationLabel(session.startedAt, now.toISOString())+')');
  resetPutawayUI();
}

function onProductionCustomerInput(){
  const name=document.getElementById('production-customer-input').value.trim().toLowerCase();
  pendingProductionMarket=null; pendingProductionOrderId=null; pendingProductionMatchedName=null;
  if(!name) return;
  // Not date-restricted: a pending order carried over from a previous day and
  // assigned today must still be matchable here, or it could never be packed.
  const match=orders.find(o=>o.status==='picked' && o.customer.trim().toLowerCase()===name);
  if(match){ pendingProductionMarket=match.market; pendingProductionOrderId=match.fbKey; pendingProductionMatchedName=name; }
}
// Marks the CURRENT worker's own part of a (possibly multi-person) order as
// done. The order only flips to status 'picked' — as one single order, never
// split into separate orders — once every worker assigned to it has done the
// same. Each contributor still gets their own production log entry for pay
// and stats purposes.
// Starts THIS worker's own clock on their part of the order — separate from
// assignedAt (when an admin assigned it, which may be well before the worker
// actually picks it up) so "time spent" reflects real active work, not queue
// time. Same safe per-assignee subpath write pattern as toggleAssignWorker/
// markOrderPicked, so teammates starting/finishing at the same moment can't
// clobber each other.
// Finds this worker's own next not-yet-started order (excluding fbKey, the
// one just finished), sorted oldest-assigned-first — i.e. whichever order is
// next in their queue. Used both to gate manual Start presses and to
// auto-start the next order the instant the current one is marked done.
function findNextQueuedOrderForWorker(workerId, excludeFbKey){
  return orders.filter(o=>{
    if(o.fbKey===excludeFbKey) return false;
    if(o.status!=='assigned') return false;
    const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(workerId));
    return mine && !mine.done && !mine.startedAt;
  }).sort((a,b)=>(a.assignedAt||'').localeCompare(b.assignedAt||''))[0] || null;
}
// Writes startedAt for `workerId` on `fbKey`, using the same safe per-assignee
// subpath pattern as markOrderPicked. Called only by reconcileOrderTimers()
// and markOrderPicked()'s next-order hand-off — there's no manual Start
// button anymore, this is fully automatic.
function beginOrderTimerFor(order, workerId, workerName){
  const assignees=getOrderAssignees(order);
  const map={};assignees.forEach(a=>{map[a.workerId]=a});
  if(!map[workerId] || map[workerId].startedAt) return;
  map[workerId]={...map[workerId],startedAt:new Date().toISOString()};
  const needsMigration=!order.assignees;
  const update=needsMigration?{assignees:map}:{['assignees/'+workerId]:map[workerId]};
  wref('orders/'+order.fbKey).update(update);
}
// Auto-assigns the running clock, one order at a time per worker — no manual
// Start needed. For every worker with queued (assigned, not-yet-started)
// orders, if they don't already have one actively timing, this begins the
// timer on whichever queued order is oldest. Called every time the `orders`
// data changes (new assignment, an order finished and freed up a slot, etc.)
// so the hand-off happens automatically and immediately.
function reconcileOrderTimers(){
  const workerIds = new Set();
  orders.forEach(o=>{
    if(o.status!=='assigned') return;
    getOrderAssignees(o).forEach(a=>{ if(!a.done) workerIds.add(String(a.workerId)); });
  });
  workerIds.forEach(widStr=>{
    const hasActive = orders.some(o=>{
      const mine=getOrderAssignees(o).find(a=>String(a.workerId)===widStr);
      return mine && mine.startedAt && !mine.done;
    });
    if(hasActive) return;
    const next = findNextQueuedOrderForWorker(widStr, null);
    if(!next) return;
    const w = workers.find(x=>String(x.id)===widStr);
    beginOrderTimerFor(next, widStr, w?w.name:next.assignedWorkerName);
  });
}
function markOrderPicked(fbKey){
  const o=orders.find(x=>x.fbKey===fbKey);if(!o)return;
  const w=workers.find(x=>x.id===pendingProductionWorkerId);if(!w)return;
  const assignees=getOrderAssignees(o);
  const map={};assignees.forEach(a=>{map[a.workerId]=a});
  if(!map[w.id]){showToast(w.name+' is not assigned to this order');return}
  if(!map[w.id].startedAt){showToast('Press Start before logging quantity');return}
  const input=document.getElementById('order-pick-qty-'+fbKey);
  const qty=parseInt(input?input.value:'',10);
  if(!Number.isFinite(qty)||qty<=0){showToast('Enter the quantity picked');return}
  const now=new Date();
  map[w.id]={...map[w.id],done:true,doneAt:now.toISOString(),qty};
  const allDone=assigneesAllDone(map);
  // As in toggleAssignWorker: write only THIS worker's own assignees/<id>
  // subpath (unless this order is still on the legacy single-assignee fields
  // and needs a one-time full write to migrate). That way, if two teammates
  // both hit "Mark my part done" within the same round-trip, neither write
  // can stomp on the other's completion — reconcileOrderCompletions() closes
  // out the order once every subpath shows done, even if this client's own
  // "allDone" check below was a beat behind.
  const needsMigration=!o.assignees;
  const update=needsMigration?{assignees:map}:{['assignees/'+w.id]:map[w.id]};
  if(allDone){
    update.status='picked';
    update.qtyPicked=sumAssigneesQty(map);
    update.pickedAt=now.toISOString();
  }
  wref('orders/'+fbKey).update(update);
  const ci=getCheckinState(w.id);
  const durationMinutes=Math.max(0,Math.round((now.getTime()-new Date(map[w.id].startedAt).getTime())/60000));
  wref('production').push({
    workerId:w.id, workerName:w.name, date:today(), shift: ci?(ci.shift||null):null,
    taskType:'picking', orders:1, skus:qty, customer:o.customer, marketRegion:o.market, orderId:fbKey,
    startedAt:map[w.id].startedAt, doneAt:now.toISOString(), durationMinutes,
    time: now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}), createdAt: now.toISOString()
  });
  // Hand off the clock to whatever's next in this worker's queue — no manual
  // Start needed for it. Reads from the pre-write `orders` snapshot (the
  // Firebase listener hasn't caught up to this order's own update yet, which
  // is fine since we already excluded fbKey from the search).
  const next = findNextQueuedOrderForWorker(w.id, fbKey);
  if(next) beginOrderTimerFor(next, w.id, w.name);
  if(allDone){
    showToast('Order fully picked — '+sumAssigneesQty(map)+' units for '+o.customer+' ('+durationLabel(map[w.id].startedAt,now.toISOString())+')'+(next?' — next up: '+next.customer:''));
  } else {
    const remaining=Object.values(map).filter(a=>!a.done).map(a=>a.workerName).join(', ');
    showToast('Your '+qty+' units logged in '+durationLabel(map[w.id].startedAt,now.toISOString())+' — waiting on '+remaining+' to finish '+o.customer);
  }
}
function renderAssignedOrdersInModal(){
  const wrap=document.getElementById('production-assigned-orders');if(!wrap)return;
  // Only relevant on the Picking tab — packing/replenishment/putaway have
  // nothing to do with orders still waiting to be picked.
  if(pendingProductionType !== 'picking'){ wrap.style.display='none'; wrap.innerHTML=''; return; }
  const w=workers.find(x=>x.id===pendingProductionWorkerId);
  // Not date-restricted: an order assigned today may originally be from a
  // previous day (carried over as "pending") — it still needs to show up here
  // so the worker can actually pick it, or assigning it would be a dead end.
  // Only surfaces orders this worker hasn't finished their own part of yet —
  // once they've marked done, it drops off their list even if teammates
  // haven't finished, since the order still isn't split into separate orders.
  // Sorted oldest-assigned-first so the queue below has a stable, predictable
  // order — whichever order they were handed first is next in line.
  const list=w?orders.filter(o=>{
    if(o.status!=='assigned')return false;
    const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(w.id));
    return mine&&!mine.done;
  }).sort((a,b)=>(a.assignedAt||'').localeCompare(b.assignedAt||'')):[];
  if(!list.length){wrap.style.display='none';wrap.innerHTML='';return}
  wrap.style.display='block';
  // Only one order times at once per worker: whichever already has a
  // startedAt is active; everything else is queued behind it. There's no
  // manual Start anymore — reconcileOrderTimers() (run whenever order data
  // changes) automatically begins the oldest queued order's clock the moment
  // no order is active for that worker, so the "next up" one below should
  // flip to a running timer within a moment on its own.
  const activeOrder = list.find(o=>{
    const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(w.id));
    return mine&&mine.startedAt;
  });
  const nextUpFbKey = activeOrder ? null : (list[0] ? list[0].fbKey : null);
  wrap.innerHTML='<p class="section-title" style="margin-top:0">Assigned orders to pick'+(list.length>1?' <span style="font-weight:400;color:var(--text3);font-size:12px">— timed one at a time, in order assigned</span>':'')+'</p>'+list.map((o,i)=>{
    const mine=getOrderAssignees(o).find(a=>String(a.workerId)===String(w.id));
    const teammates=getOrderAssignees(o).filter(a=>String(a.workerId)!==String(w.id));
    const teamNote=teammates.length?'<div class="worker-meta" style="font-size:11.5px">With '+teammates.map(a=>escHtml(a.workerName)+(a.done?' ✓':a.startedAt?' (working)':'')).join(', ')+'</div>':'';
    const started=mine&&mine.startedAt;
    const isNextUp = o.fbKey===nextUpFbKey;
    let timerLine, actionHtml;
    if(started){
      timerLine = '⏱ Working: <span class="order-timer" data-assigned-at="'+mine.startedAt+'">'+elapsedLabel(mine.startedAt)+'</span>';
      actionHtml = '<input type="number" min="1" id="order-pick-qty-'+o.fbKey+'" placeholder="Your qty" style="width:90px">'+
        '<button class="btn primary" onclick="markOrderPicked(\''+o.fbKey+'\')"><i class="ti ti-check"></i> End &amp; mark done</button>';
    } else if(isNextUp){
      timerLine = 'Starting your timer…';
      actionHtml = '';
    } else {
      timerLine = 'Queued — #'+(i+1)+' · starts automatically once the current order is marked done';
      actionHtml = '';
    }
    return '<div class="card" style="display:flex;align-items:center;gap:8px;padding:10px;margin-bottom:8px'+(!started&&!isNextUp?';opacity:0.6':'')+'">'+
    '<div style="flex:1"><div style="font-weight:600">'+escHtml(o.customer)+'</div><div class="worker-meta">'+escHtml(o.market||'')+' · '+timerLine+'</div>'+teamNote+'</div>'+
    actionHtml+
    '</div>';
  }).join('');
}
// Renders the filterable "Pick order to pack" list — filtered client-side
// against the search box so a busy day's picked orders don't need scrolling
// through to find one customer. Re-run on every keystroke and on every live
// re-render of the modal (Firebase listeners refresh this in the background
// while it's open), so it always reflects the current picked-orders list and
// whatever's currently typed in the search box.
function renderPackOrderList(){
  const listEl = document.getElementById('production-pack-order-list');
  if(!listEl) return;
  const query = (document.getElementById('production-pack-order-search')?.value || '').trim().toLowerCase();
  const pickedOrders = orders.filter(o=>o.status==='picked').sort((a,b)=>(a.pickedAt||'').localeCompare(b.pickedAt||''));
  // Keep the selection intact across live re-renders unless that order is no
  // longer available to pick (e.g. someone else just packed it).
  if(pendingProductionOrderId && !pickedOrders.some(o=>o.fbKey===pendingProductionOrderId)){
    clearPackOrderSelection();
    showToast('That order is no longer available to pack (picked up by someone else) — please choose another');
  }
  const filtered = query ? pickedOrders.filter(o=>(o.customer||'').toLowerCase().includes(query) || (o.market||'').toLowerCase().includes(query)) : pickedOrders;
  if(!filtered.length){
    listEl.innerHTML = '<div style="padding:14px 12px;text-align:center;color:var(--text3);font-size:13px">'+
      (pickedOrders.length ? 'No match for "'+escHtml(query)+'"' : 'No picked orders ready to pack yet') +
      '</div>';
    return;
  }
  listEl.innerHTML = filtered.map(o=>{
    const qtyPart = o.qtyPicked ? o.qtyPicked+' units, ' : '';
    const selected = o.fbKey===pendingProductionOrderId;
    return '<div onclick="selectPackOrder(\''+o.fbKey+'\')" style="padding:10px 12px;cursor:pointer;border-bottom:0.5px solid var(--border2)'+(selected?';background:var(--bg3)':'')+'">'+
      '<div style="font-weight:600;font-size:13.5px;display:flex;align-items:center;justify-content:space-between;gap:6px">'+escHtml(o.customer)+(selected?'<i class="ti ti-check" style="color:var(--green-text)"></i>':'')+'</div>'+
      '<div class="worker-meta" style="font-size:11.5px">'+escHtml(o.market)+' · '+qtyPart+'picked '+elapsedLabel(o.pickedAt)+' ago</div>'+
    '</div>';
  }).join('');
}
// Selecting an order from the "Pick order to pack" list fills in the same
// hidden customer field addProductionEntry() already reads, and wires up the
// order-linking fields exactly like typing a matching name used to.
function selectPackOrder(fbKey){
  const hidden = document.getElementById('production-customer-input');
  if(!hidden) return;
  const o = orders.find(x=>x.fbKey===fbKey);
  if(!o) return;
  hidden.value = o.customer;
  pendingProductionMarket = o.market;
  pendingProductionOrderId = o.fbKey;
  pendingProductionMatchedName = o.customer.trim().toLowerCase();
  renderPackOrderList(); // re-render so the check mark / highlight moves to the new selection
}
function clearPackOrderSelection(){
  const hidden = document.getElementById('production-customer-input');
  if(hidden) hidden.value = '';
  pendingProductionMarket = null; pendingProductionOrderId = null; pendingProductionMatchedName = null;
}
function togglePackManualEntry(){
  const wrap = document.getElementById('production-pack-manual-wrap');
  const label = document.getElementById('pack-manual-toggle-label');
  if(!wrap) return;
  const showManual = wrap.style.display === 'none';
  wrap.style.display = showManual ? 'flex' : 'none';
  if(label) label.textContent = showManual ? 'Use the search list instead' : "Can't find it? Enter customer manually";
  if(showManual){
    const search = document.getElementById('production-pack-order-search'); if(search) search.value = '';
    clearPackOrderSelection();
    renderPackOrderList();
    document.getElementById('production-customer-input').value = '';
    document.getElementById('production-customer-input').focus();
  }
}

function deleteProductionEntry(fbKey){
  if(!confirm('Delete this entry?')) return;
  wref('production/'+fbKey).remove();
}

function renderProductionModal(){
  if(!pendingProductionWorkerId) return;
  renderAssignedOrdersInModal();
  renderPackOrderList();
  const allEntries = getWorkerTodayProduction(pendingProductionWorkerId).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
  const type = pendingProductionType || 'picking';
  const totalsEl = document.getElementById('production-modal-totals');
  if(totalsEl){
    if(type==='picking' || type==='packing'){
      const typeEntries = allEntries.filter(e=>getTaskType(e)===type);
      const totalOrders = typeEntries.reduce((s,e)=>s+(e.orders||0),0);
      const totalSkus = typeEntries.reduce((s,e)=>s+(e.skus||0),0);
      totalsEl.innerHTML =
        '<div class="stat-card" style="flex:1"><div class="stat-label">Orders '+(type==='packing'?'packed':'picked')+' today</div><div class="stat-value">'+totalOrders.toLocaleString()+'</div></div>'+
        '<div class="stat-card" style="flex:1"><div class="stat-label">SKUs '+(type==='packing'?'packed':'picked')+' today</div><div class="stat-value">'+totalSkus.toLocaleString()+'</div></div>';
    } else {
      const typeEntries = allEntries.filter(e=>getTaskType(e)===type);
      const totalQty = typeEntries.reduce((s,e)=>s+(e.qty||0),0);
      totalsEl.innerHTML =
        '<div class="stat-card" style="flex:1"><div class="stat-label">'+PRODUCTION_TYPES[type].label+' today</div><div class="stat-value">'+totalQty.toLocaleString()+' units</div></div>';
    }
  }
  const list = document.getElementById('production-entries-list');
  if(!list) return;
  if(!allEntries.length){ list.innerHTML = '<div class="empty-state" style="padding:14px"><i class="ti ti-package"></i>No entries yet today — add your first batch above</div>'; return; }
  list.innerHTML = allEntries.slice().reverse().map(e=>{
    const t = getTaskType(e);
    const meta = PRODUCTION_TYPES[t] || PRODUCTION_TYPES.picking;
    let line;
    if(t==='picking' || t==='packing'){
      line = meta.icon+' '+(e.orders||0)+' orders · '+(e.skus||0)+' SKUs';
      if(t==='packing'){
        line += (e.customer?' · '+e.customer:'')+(e.weight?' · '+e.weight+'kg':'')+(e.cartons?' · '+e.cartons+' ctn':'');
        line += ' <span style="color:var(--green-text)">· ready for dispatch</span>';
      }
    } else if(t==='putaway'){
      line = meta.icon+' '+(e.qty||0)+' units from '+(e.supplier||'Unknown supplier')+(e.startedAt&&e.doneAt?' · '+durationLabel(e.startedAt,e.doneAt):'');
    } else {
      line = meta.icon+' '+(e.qty||0)+' units '+meta.short+(e.location?' · '+e.location:'');
    }
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg2);border-radius:var(--radius);font-size:13px;gap:8px">'+
    '<span>'+line+' <span style="color:var(--text2)">· '+e.time+'</span></span>'+
    '<span style="display:flex;gap:4px;flex-shrink:0">'+
    '<button class="btn" style="padding:4px 8px" onclick="editProductionEntry(\''+e.fbKey+'\')" title="Edit"><i class="ti ti-pencil"></i></button>'+
    '<button class="btn danger" style="padding:4px 8px" onclick="deleteProductionEntry(\''+e.fbKey+'\')" title="Delete"><i class="ti ti-trash"></i></button>'+
    '</span>'+
    '</div>';
  }).join('');
}

// ════════════════════════════════════════
// ---- OUTBOUND (dispatch tracking for packed orders) ----
// ════════════════════════════════════════
function getAllPackingEntries(){
  return production.filter(p=>getTaskType(p)==='packing').sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}
function getOutboundEntries(type){
  return production.filter(p=>getTaskType(p)===type).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
}

function setOutboundFilter(f){
  outboundFilter = f;
  renderOutbound();
}

function setOutboundView(type){
  outboundViewType = type;
  renderOutbound();
}

function clearOutboundDateFilter(){
  const el = document.getElementById('outbound-date-filter');
  if(el) el.value = '';
  const elTo = document.getElementById('outbound-date-filter-to');
  if(elTo) elTo.value = '';
  renderOutbound();
}

function updateOutboundBadge(){
  const badge = document.getElementById('outbound-count-badge');
  if(!badge) return;
  const pendingCount = getAllPackingEntries().filter(e=>!e.pickupAt).length;
  if(pendingCount>0){ badge.textContent = pendingCount; badge.style.display='inline-block'; }
  else badge.style.display='none';
}

function renderOutbound(){
  ['packing','picking'].forEach(v=>{
    const el = document.getElementById('outbound-view-'+v);
    if(el){ el.classList.toggle('primary', outboundViewType===v); }
  });
  const isPacking = outboundViewType==='packing';
  const titleEl = document.getElementById('outbound-section-title');
  if(titleEl) titleEl.textContent = isPacking ? 'Packed orders — dispatch tracking' : 'Picked orders';
  const searchEl = document.getElementById('outbound-search');
  if(searchEl) searchEl.placeholder = isPacking ? 'Search customer or worker…' : 'Search customer or worker…';
  const statusFiltersEl = document.getElementById('outbound-status-filters');
  if(statusFiltersEl) statusFiltersEl.style.display = isPacking ? 'flex' : 'none';
  const theadEl = document.getElementById('outbound-thead');
  if(theadEl){
    theadEl.innerHTML = isPacking
      ? '<tr><th>Customer</th><th>Packed by</th><th>Packed at</th><th style="text-align:right">Orders</th><th style="text-align:right">SKUs</th><th style="text-align:right">Weight</th><th style="text-align:right">Cartons</th><th>3PL</th><th>Region</th><th>Picked up</th><th></th></tr>'
      : '<tr><th>Customer</th><th>Picked by</th><th>Date</th><th>Time</th><th style="text-align:right">Orders</th><th style="text-align:right">SKUs</th><th></th></tr>';
  }

  ['pending','dispatched','all'].forEach(f=>{
    const el = document.getElementById('outbound-filter-'+f);
    if(el){ el.style.background = outboundFilter===f?'var(--bg2)':'var(--bg)'; el.style.fontWeight = outboundFilter===f?'600':'500'; }
  });
  const all = getOutboundEntries(outboundViewType);
  const search = (document.getElementById('outbound-search')?.value||'').trim().toLowerCase();
  // Both date fields now drive the on-screen list as a true range — not just
  // the Excel export. Previously the second field only affected the download,
  // so the two pickers looked like a from/to range but only one of them
  // actually changed what was visible on screen.
  const dateFrom = (document.getElementById('outbound-date-filter')?.value||'').trim();
  const dateTo = (document.getElementById('outbound-date-filter-to')?.value||'').trim();
  let rows = all.filter(e=>{
    if(isPacking){
      if(outboundFilter==='pending' && e.pickupAt) return false;
      if(outboundFilter==='dispatched' && !e.pickupAt) return false;
    }
    if(dateFrom && e.date<dateFrom) return false;
    if(dateTo && e.date>dateTo) return false;
    if(search && !((e.customer||'').toLowerCase().includes(search) || (e.workerName||'').toLowerCase().includes(search))) return false;
    return true;
  });

  const statsEl = document.getElementById('outbound-stats');
  if(statsEl){
    const t = today();
    const ordersToday = orders.filter(o=>o.date===t).length;
    // Picked/packed "today" now read from the orders collection itself (via
    // pickedAt/packedAt), not from summing the production log's free-text
    // "orders" field — that field also counts generic picking/packing batches
    // that were never linked to a real order, so it could disagree with
    // "Orders today" / "Orders remaining today" / "Pending orders" (all of
    // which come from the orders collection) and make the numbers on this
    // dashboard look inconsistent with each other.
    // localDay() so a 23:40 pick doesn't get filed under tomorrow (the stored
    // timestamps are UTC; slicing the first 10 characters compared a UTC date
    // against a local one).
    const ordersPickedToday = orders.filter(o=>localDay(o.pickedAt)===t).length;
    const ordersPackedToday = orders.filter(o=>localDay(o.packedAt)===t).length;
    // Today's orders not yet fully picked (still unassigned or in progress) —
    // i.e. what's actually left to pick before the day's order list is clear.
    const ordersRemainingToday = orders.filter(o=>o.date===t && orderStatus(o)!=='picked' && orderStatus(o)!=='packed').length;
    // Every order anywhere that hasn't been packed yet — unassigned, in
    // progress, or picked-but-not-packed. Built from the same two lists shown
    // in the tables below (Pending orders + Ready to pack) so the headline
    // number always reconciles with the rows an admin can actually see.
    const totalPendingOrders = getPendingOrders().length + getReadyToPackOrders().length;
    // Snapshot of orders sitting picked but not yet packed — the same set
    // shown in the "Ready to pack" table above, surfaced here as a single
    // number so it's visible without scrolling to that table.
    const pendingPackingCount = getReadyToPackOrders().length;
    if(isPacking){
      const pendingCount = all.filter(e=>!e.pickupAt).length;
      const previousPendingCount = all.filter(e=>!e.pickupAt && e.date!==t).length;
      const dispatchedCount = all.filter(e=>e.pickupAt).length;
      statsEl.className = 'stat-grid stat-grid-9';
      statsEl.innerHTML =
        statMini('Orders today', ordersToday.toLocaleString(), "openOutboundSnapshot('orders-today')") +
        statMini('Orders picked today', ordersPickedToday.toLocaleString(), "openOutboundSnapshot('picked-today')") +
        statMini('Orders remaining today', ordersRemainingToday.toLocaleString(), "openOutboundSnapshot('remaining-today')") +
        statMini('Orders packed today', ordersPackedToday.toLocaleString(), "openOutboundSnapshot('packed-today')") +
        statMini('Total pending orders', totalPendingOrders.toLocaleString(), "openOutboundSnapshot('total-pending-orders')") +
        statMini('Pending packing', pendingPackingCount.toLocaleString(), "openOutboundSnapshot('pending-packing')") +
        statMini('Previous pending pickup', previousPendingCount, "openOutboundSnapshot('previous-pending-pickup')") +
        statMini('Total pending pickup', pendingCount, "openOutboundSnapshot('total-pending-pickup')") +
        statMini('Dispatched', dispatchedCount, "openOutboundSnapshot('dispatched')");
    } else {
      const totalOrders = rows.reduce((s,e)=>s+(e.orders||0),0);
      const totalSkus = rows.reduce((s,e)=>s+(e.skus||0),0);
      statsEl.className = 'stat-grid stat-grid-6';
      statsEl.innerHTML =
        statMini('Orders today', ordersToday.toLocaleString(), "openOutboundSnapshot('orders-today')") +
        statMini('Orders picked today', ordersPickedToday.toLocaleString(), "openOutboundSnapshot('picked-today')") +
        statMini('Orders remaining today', ordersRemainingToday.toLocaleString(), "openOutboundSnapshot('remaining-today')") +
        statMini('Total picked batches', rows.length, "openOutboundSnapshot('total-picked-batches')") +
        statMini('Orders picked', totalOrders.toLocaleString()) +
        statMini('SKUs picked', totalSkus.toLocaleString());
    }
  }

  const body = document.getElementById('outbound-body');
  if(body){
    if(isPacking){
      body.innerHTML = rows.length ? rows.map(e=>{
        const dispatched = !!e.pickupAt;
        const pickupDisplay = dispatched ? new Date(e.pickupAt).toLocaleString('en-US',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}) : '<span class="badge pending">Pending</span>';
        return '<tr>'+
          '<td>'+(e.customer||'—')+'</td>'+
          '<td>'+(e.workerName||'—')+'</td>'+
          '<td>'+e.date+' · '+e.time+'</td>'+
          '<td style="text-align:right">'+(e.orders||0).toLocaleString()+'</td>'+
          '<td style="text-align:right">'+(e.skus||0).toLocaleString()+'</td>'+
          '<td style="text-align:right">'+(e.weight?e.weight+'kg':'—')+'</td>'+
          '<td style="text-align:right">'+(e.cartons||'—')+'</td>'+
          '<td>'+(e.dispatch3PL||'—')+'</td>'+
          '<td>'+(e.marketRegion||'—')+'</td>'+
          '<td>'+pickupDisplay+'</td>'+
          '<td><button class="btn" style="padding:4px 8px;font-size:12px" onclick="openOutboundModal(\''+e.fbKey+'\')"><i class="ti ti-edit"></i> Edit</button></td>'+
        '</tr>';
      }).join('') : '<tr><td colspan="11"><div class="empty-state"><i class="ti ti-package"></i>No packed orders match this filter</div></td></tr>';
    } else {
      const isSuperAdmin = currentAdmin?.role==='Super Admin';
      body.innerHTML = rows.length ? rows.map(e=>{
        return '<tr>'+
          '<td>'+(e.customer?escHtml(e.customer):'<span style="color:var(--text3)">Batch (no order linked)</span>')+'</td>'+
          '<td>'+(e.workerName||'—')+'</td>'+
          '<td>'+e.date+'</td>'+
          '<td>'+(e.time||'—')+'</td>'+
          '<td style="text-align:right">'+(e.orders||0).toLocaleString()+'</td>'+
          '<td style="text-align:right">'+(e.skus||0).toLocaleString()+'</td>'+
          '<td>'+(isSuperAdmin?'<button class="btn danger" style="padding:4px 8px;font-size:12px" onclick="deleteProductionEntry(\''+e.fbKey+'\')" title="Delete"><i class="ti ti-trash"></i></button>':'')+'</td>'+
        '</tr>';
      }).join('') : '<tr><td colspan="7"><div class="empty-state"><i class="ti ti-list-check"></i>No picked orders match this filter</div></td></tr>';
    }
  }
  updateOutboundBadge();
}

// ---- OUTBOUND SNAPSHOT DRILL-DOWN (click a stat card to see, edit, delete, or download the rows behind it) ----
let snapshotState = { key:null, type:null, label:null, rows:[] };

function openOutboundSnapshot(key){
  const t = today();
  let rows, type, label, sub;
  switch(key){
    case 'orders-today':
      rows = orders.filter(o=>o.date===t);
      type='order'; label='Orders today'; sub='Every order added today, any status.';
      break;
    case 'picked-today':
      rows = orders.filter(o=>localDay(o.pickedAt)===t);
      type='order'; label='Orders picked today'; sub='Orders whose picking was completed today.';
      break;
    case 'remaining-today':
      rows = orders.filter(o=>o.date===t && orderStatus(o)!=='picked' && orderStatus(o)!=='packed');
      type='order'; label='Orders remaining today'; sub="Today's orders not yet fully picked.";
      break;
    case 'packed-today':
      rows = orders.filter(o=>localDay(o.packedAt)===t);
      type='order'; label='Orders packed today'; sub='Orders whose packing was completed today.';
      break;
    case 'total-pending-orders':
      rows = getPendingOrders().concat(getReadyToPackOrders());
      type='order'; label='Total pending orders'; sub='Every order not yet packed — unassigned, in progress, or picked and waiting to be packed.';
      break;
    case 'pending-packing':
      rows = getReadyToPackOrders();
      type='order'; label='Pending packing'; sub='Picked orders waiting to be packed.';
      break;
    case 'previous-pending-pickup':
      rows = getAllPackingEntries().filter(e=>!e.pickupAt && e.date!==t);
      type='packing'; label='Previous pending pickup'; sub='Packed batches from before today still waiting for pickup.';
      break;
    case 'total-pending-pickup':
      rows = getAllPackingEntries().filter(e=>!e.pickupAt);
      type='packing'; label='Total pending pickup'; sub='Every packed batch not yet picked up.';
      break;
    case 'dispatched':
      rows = getAllPackingEntries().filter(e=>e.pickupAt);
      type='packing'; label='Dispatched'; sub='Packed batches already picked up.';
      break;
    case 'total-picked-batches': {
      // Mirrors the same search + date filtering renderOutbound() applies to
      // the on-screen "Total picked batches" count — without this, the
      // snapshot would show every picking batch ever logged, disagreeing
      // with the number on the card if a search or date filter is active.
      const search = (document.getElementById('outbound-search')?.value||'').trim().toLowerCase();
      const dateFrom = (document.getElementById('outbound-date-filter')?.value||'').trim();
      const dateTo = (document.getElementById('outbound-date-filter-to')?.value||'').trim();
      rows = getOutboundEntries('picking').filter(e=>{
        if(dateFrom && e.date<dateFrom) return false;
        if(dateTo && e.date>dateTo) return false;
        if(search && !((e.customer||'').toLowerCase().includes(search) || (e.workerName||'').toLowerCase().includes(search))) return false;
        return true;
      });
      type='picking'; label='Total picked batches'; sub='Every picking batch matching your current search/date filter, most recent first.';
      break;
    }
    default: return;
  }
  snapshotState = { key, type, label, rows };
  renderSnapshotModal(sub);
  const modal = document.getElementById('snapshot-modal');
  if(modal) modal.classList.remove('hidden');
}

function snapshotEmptyRow(colspan){
  return '<tr><td colspan="'+colspan+'"><div class="empty-state"><i class="ti ti-inbox"></i>Nothing here right now</div></td></tr>';
}

function renderSnapshotModal(sub){
  const { type, label, rows } = snapshotState;
  const titleEl = document.getElementById('snapshot-modal-title');
  if(titleEl) titleEl.textContent = label+' ('+rows.length+')';
  const subEl = document.getElementById('snapshot-modal-sub');
  if(subEl && sub!==undefined) subEl.textContent = sub;
  const thead = document.getElementById('snapshot-modal-thead');
  const body = document.getElementById('snapshot-modal-body');
  if(!thead || !body) return;
  const isSuperAdmin = currentAdmin?.role==='Super Admin';

  if(type==='order'){
    thead.innerHTML = '<tr><th>Customer</th><th>Market</th><th>Date</th><th>Status</th><th>Assigned to</th><th></th></tr>';
    body.innerHTML = rows.length ? rows.map(o=>{
      const statusBadge = o.status==='packed' ? '<span class="badge approved">Packed</span>'
        : o.status==='picked' ? '<span class="badge approved">Picked</span>'
        : o.status==='assigned' ? '<span class="badge pending">In progress</span>'
        : '<span class="badge">Unassigned</span>';
      const isDone = o.status==='picked' || o.status==='packed';
      return '<tr>'+
        '<td>'+escHtml(o.customer||'—')+'</td>'+
        '<td>'+escHtml(o.market||'—')+'</td>'+
        '<td>'+(o.date||'—')+'</td>'+
        '<td>'+statusBadge+'</td>'+
        '<td>'+assignCellHtml(o,isDone).replace('onclick="openAssignWorkersModal(','onclick="closeSnapshotModal();openAssignWorkersModal(')+'</td>'+
        '<td><button class="btn danger" style="padding:4px 8px;font-size:12px" onclick="removeOrderRow(\''+o.fbKey+'\');openOutboundSnapshot(snapshotState.key)" title="Delete"><i class="ti ti-trash"></i></button></td>'+
      '</tr>';
    }).join('') : snapshotEmptyRow(6);
  } else if(type==='packing'){
    thead.innerHTML = '<tr><th>Customer</th><th>Packed by</th><th>Packed at</th><th style="text-align:right">Orders</th><th style="text-align:right">SKUs</th><th>Picked up</th><th></th></tr>';
    body.innerHTML = rows.length ? rows.map(e=>{
      const dispatched = !!e.pickupAt;
      const pickupDisplay = dispatched ? new Date(e.pickupAt).toLocaleString('en-US',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}) : '<span class="badge pending">Pending</span>';
      const delBtn = isSuperAdmin ? '<button class="btn danger" style="padding:4px 8px;font-size:12px" onclick="deleteProductionEntry(\''+e.fbKey+'\');openOutboundSnapshot(snapshotState.key)" title="Delete"><i class="ti ti-trash"></i></button>' : '';
      return '<tr>'+
        '<td>'+(e.customer||'—')+'</td>'+
        '<td>'+(e.workerName||'—')+'</td>'+
        '<td>'+e.date+' · '+e.time+'</td>'+
        '<td style="text-align:right">'+(e.orders||0).toLocaleString()+'</td>'+
        '<td style="text-align:right">'+(e.skus||0).toLocaleString()+'</td>'+
        '<td>'+pickupDisplay+'</td>'+
        '<td style="display:flex;gap:4px;flex-wrap:wrap"><button class="btn" style="padding:4px 8px;font-size:12px" onclick="closeSnapshotModal();openOutboundModal(\''+e.fbKey+'\')" title="Edit"><i class="ti ti-edit"></i> Edit</button>'+delBtn+'</td>'+
      '</tr>';
    }).join('') : snapshotEmptyRow(7);
  } else {
    thead.innerHTML = '<tr><th>Customer</th><th>Picked by</th><th>Date</th><th>Time</th><th style="text-align:right">Orders</th><th style="text-align:right">SKUs</th><th></th></tr>';
    body.innerHTML = rows.length ? rows.map(e=>{
      const delBtn = isSuperAdmin ? '<button class="btn danger" style="padding:4px 8px;font-size:12px" onclick="deleteProductionEntry(\''+e.fbKey+'\');openOutboundSnapshot(snapshotState.key)" title="Delete"><i class="ti ti-trash"></i></button>' : '';
      return '<tr>'+
        '<td>'+(e.customer?escHtml(e.customer):'<span style="color:var(--text3)">Batch (no order linked)</span>')+'</td>'+
        '<td>'+(e.workerName||'—')+'</td>'+
        '<td>'+e.date+'</td>'+
        '<td>'+(e.time||'—')+'</td>'+
        '<td style="text-align:right">'+(e.orders||0).toLocaleString()+'</td>'+
        '<td style="text-align:right">'+(e.skus||0).toLocaleString()+'</td>'+
        '<td>'+delBtn+'</td>'+
      '</tr>';
    }).join('') : snapshotEmptyRow(7);
  }
}

function closeSnapshotModal(){
  const modal = document.getElementById('snapshot-modal');
  if(modal) modal.classList.add('hidden');
}

function downloadSnapshotList(){
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  const { type, label, rows } = snapshotState;
  if(!rows.length){ showToast('Nothing to download'); return; }
  let data;
  if(type==='order'){
    data = rows.map(o=>({
      Customer:o.customer||'', Market:o.market||'', Date:o.date||'', Status:orderStatus(o),
      'Assigned to': getOrderAssignees(o).map(a=>a.workerName).join(', '),
      'Qty picked': o.qtyPicked!=null ? o.qtyPicked : ''
    }));
  } else if(type==='packing'){
    data = rows.map(e=>({
      Customer:e.customer||'', 'Packed by':e.workerName||'', Date:e.date, Time:e.time,
      Orders:e.orders||0, SKUs:e.skus||0, 'Weight (kg)':e.weight||'', Cartons:e.cartons||'',
      '3PL':e.dispatch3PL||'', Region:e.marketRegion||'',
      'Picked up at': e.pickupAt ? new Date(e.pickupAt).toLocaleString('en-US',{hour12:true}) : ''
    }));
  } else {
    data = rows.map(e=>({
      Customer:e.customer||'', 'Picked by':e.workerName||'', Date:e.date, Time:e.time||'',
      Orders:e.orders||0, SKUs:e.skus||0
    }));
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, label.replace(/[\\/*?:\[\]]/g,'').slice(0,28) || 'Sheet1');
  XLSX.writeFile(wb, label.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_'+today()+'.xlsx');
}

function buildFulfillmentRows(from, to){
  const relevantOrders = orders.filter(o=>o.date>=from && o.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||a.customer.localeCompare(b.customer));
  const packingEntries = production.filter(p=>getTaskType(p)==='packing' && p.date>=from && p.date<=to);
  return relevantOrders.map(o=>{
    const custKey = (o.customer||'').trim().toLowerCase();
    const candidates = packingEntries.filter(p=>p.date===o.date && (p.customer||'').trim().toLowerCase()===custKey);
    const match = candidates.find(p=>(p.marketRegion||'')===o.market) || candidates[0] || null;
    const status = o.status==='packed' ? (match && match.pickupAt ? 'Dispatched' : 'Packed — pending pickup')
      : o.status==='picked' ? 'Picked — awaiting packing'
      : o.status==='assigned' ? 'Assigned — picking in progress'
      : 'Unassigned';
    return {
      Date: o.date,
      Customer: o.customer,
      'Market Region': o.market,
      'Picked by': getOrderAssignees(o).map(a=>a.workerName).join(', ') || '',
      'Qty picked': o.qtyPicked!=null ? o.qtyPicked : '',
      'Packed by': match ? match.workerName : '',
      'Orders packed': match ? (match.orders||0) : '',
      'SKUs packed': match ? (match.skus||0) : '',
      'Weight (kg)': match ? (match.weight||0) : '',
      Cartons: match ? (match.cartons||0) : '',
      '3PL': match ? (match.dispatch3PL||'') : '',
      'Picked up at': match && match.pickupAt ? new Date(match.pickupAt).toLocaleString('en-US',{hour12:true}) : '',
      Status: status
    };
  });
}
function downloadFulfillmentReport(){
  if(!adminHasPerm('orders')){showToast('You do not have access to Orders');return}
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  const from = (document.getElementById('fulfillment-from')||{value:''}).value || today();
  const to = (document.getElementById('fulfillment-to')||{value:''}).value || today();
  if(from > to){ showToast('"From" date must be before "To" date'); return; }
  const rows = buildFulfillmentRows(from, to);
  if(!rows.length){ showToast('No orders in this range'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fulfillment');
  XLSX.writeFile(wb, 'fulfillment_report_'+from+'_to_'+to+'.xlsx');
  showToast('Fulfillment report downloaded');
}

function downloadOutboundExcel(){
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  const dateFrom = (document.getElementById('outbound-date-filter')?.value||'').trim();
  const dateTo = (document.getElementById('outbound-date-filter-to')?.value||'').trim();
  const inRange = e => (!dateFrom || e.date>=dateFrom) && (!dateTo || e.date<=(dateTo||dateFrom));
  const pickingRows = getOutboundEntries('picking')
    .filter(inRange)
    .sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''))
    .map(e=>({ Customer: e.customer||'', 'Picked by': e.workerName||'', Date: e.date, Time: e.time||'', Orders: e.orders||0, SKUs: e.skus||0 }));
  const packingRows = getOutboundEntries('packing')
    .filter(inRange)
    .sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''))
    .map(e=>({
      'Packed by': e.workerName||'', Customer: e.customer||'', Date: e.date, Time: e.time||'',
      Orders: e.orders||0, SKUs: e.skus||0, 'Weight (kg)': e.weight||0, Cartons: e.cartons||0,
      '3PL': e.dispatch3PL||'', 'Market Region': e.marketRegion||'',
      'Picked up at': e.pickupAt ? new Date(e.pickupAt).toLocaleString('en-US',{hour12:true}) : '',
      Status: e.pickupAt ? 'Dispatched' : 'Pending'
    }));
  if(!pickingRows.length && !packingRows.length){ showToast('No picked or packed orders to export for this filter'); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pickingRows.length?pickingRows:[{Customer:'','Picked by':'',Date:'',Time:'',Orders:'',SKUs:''}]), 'Picked');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(packingRows.length?packingRows:[{'Packed by':'',Customer:'',Date:'',Time:'',Orders:'',SKUs:'','Weight (kg)':'',Cartons:'','3PL':'','Market Region':'','Picked up at':'',Status:''}]), 'Packed');
  const label = dateFrom && dateTo ? dateFrom+'_to_'+dateTo : dateFrom || 'all_dates';
  XLSX.writeFile(wb, 'picked_and_packed_'+label+'.xlsx');
  showToast('Excel file downloaded');
}

function openOutboundModal(fbKey){
  const e = production.find(p=>p.fbKey===fbKey);
  if(!e) return;
  pendingOutboundFbKey = fbKey;
  document.getElementById('outbound-modal-summary').innerHTML =
    'Packed by '+e.workerName+' · '+e.date+' · '+e.time;
  document.getElementById('outbound-customer-input').value = e.customer || '';
  document.getElementById('outbound-orders-input').value = e.orders || '';
  document.getElementById('outbound-skus-input').value = e.skus || '';
  document.getElementById('outbound-weight-input').value = e.weight || '';
  document.getElementById('outbound-cartons-input').value = e.cartons || '';
  document.getElementById('outbound-3pl-input').value = e.dispatch3PL || '';
  document.getElementById('outbound-region-input').value = e.marketRegion || '';
  const pickupInput = document.getElementById('outbound-pickup-input');
  if(e.pickupAt){
    const d = new Date(e.pickupAt);
    const pad = n=>String(n).padStart(2,'0');
    pickupInput.value = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  } else {
    pickupInput.value = '';
  }
  document.getElementById('outbound-error').style.display = 'none';
  document.getElementById('outbound-modal').classList.remove('hidden');
}

function closeOutboundModal(){
  document.getElementById('outbound-modal').classList.add('hidden');
  pendingOutboundFbKey = null;
}

function saveOutboundDispatch(){
  if(!pendingOutboundFbKey) return;
  const err = document.getElementById('outbound-error');
  const customer = document.getElementById('outbound-customer-input').value.trim();
  const orders = parseInt(document.getElementById('outbound-orders-input').value, 10);
  const skus = parseInt(document.getElementById('outbound-skus-input').value, 10);
  const weight = parseFloat(document.getElementById('outbound-weight-input').value);
  const cartons = parseInt(document.getElementById('outbound-cartons-input').value, 10);
  const ordersOk = Number.isFinite(orders) && orders >= 0;
  const skusOk = Number.isFinite(skus) && skus >= 0;
  if(!customer || !ordersOk || !skusOk || (orders===0 && skus===0)){
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  const threePl = document.getElementById('outbound-3pl-input').value.trim();
  const region = document.getElementById('outbound-region-input').value.trim();
  const pickupVal = document.getElementById('outbound-pickup-input').value;
  const update = {
    customer: customer,
    orders: orders,
    skus: skus,
    weight: Number.isFinite(weight) && weight >= 0 ? weight : 0,
    cartons: Number.isFinite(cartons) && cartons >= 0 ? cartons : 0,
    dispatch3PL: threePl || null,
    marketRegion: region || null,
    pickupAt: pickupVal ? new Date(pickupVal).toISOString() : null
  };
  wref('production/'+pendingOutboundFbKey).update(update);
  showToast('Order updated');
  closeOutboundModal();
}
function deleteOutboundEntry(){
  if(!pendingOutboundFbKey) return;
  if(!confirm('Delete this packed order? This cannot be undone.')) return;
  wref('production/'+pendingOutboundFbKey).remove();
  showToast('Entry deleted');
  closeOutboundModal();
}

// ════════════════════════════════════════
// ---- ANALYTICS ----
// ════════════════════════════════════════
function statMini(label, val, onclick){
  const cls = onclick ? 'stat-card stat-card-clickable' : 'stat-card';
  const attrs = onclick ? ' onclick="'+onclick+'" role="button" tabindex="0"' : '';
  return '<div class="'+cls+'"'+attrs+'><div class="stat-label">'+label+'</div><div class="stat-value">'+val+'</div></div>';
}

function setAnalyticsRange(type){
  analyticsRangeType = type;
  const t = new Date();
  let from, to = today();
  if(type==='today'){ from = today(); }
  else if(type==='week'){ const mon=new Date(t); mon.setDate(t.getDate()-((t.getDay()+6)%7)); from = toLocalISO(mon); }
  else if(type==='month'){ from = toLocalISO(new Date(t.getFullYear(), t.getMonth(), 1)); }
  else if(type==='year'){ from = toLocalISO(new Date(t.getFullYear(), 0, 1)); }
  else if(type==='all'){ from = '2000-01-01'; }
  document.getElementById('analytics-from').value = from;
  document.getElementById('analytics-to').value = to;
  renderAnalytics();
}

function getPreviousPeriod(type, from, to){
  if(type==='today'){ const d=new Date(from+'T00:00:00'); d.setDate(d.getDate()-1); const s=toLocalISO(d); return {from:s,to:s}; }
  if(type==='week'){ const f=new Date(from+'T00:00:00'); f.setDate(f.getDate()-7); const tt=new Date(to+'T00:00:00'); tt.setDate(tt.getDate()-7); return {from:toLocalISO(f),to:toLocalISO(tt)}; }
  if(type==='month'){ const f=new Date(from+'T00:00:00'); f.setMonth(f.getMonth()-1); const last=new Date(f.getFullYear(),f.getMonth()+1,0); return {from:toLocalISO(f),to:toLocalISO(last)}; }
  if(type==='year'){ const f=new Date(from+'T00:00:00'); f.setFullYear(f.getFullYear()-1); const tt=new Date(to+'T00:00:00'); tt.setFullYear(tt.getFullYear()-1); return {from:toLocalISO(f),to:toLocalISO(tt)}; }
  return null; // custom range or "all time" — no single equivalent prior period
}

function computeAnalytics(from, to){
  const allCI = checkins.filter(c=>c.date>=from && c.date<=to);
  const approvedCI = allCI.filter(c=>c.status==='approved');
  const pendingCI = allCI.filter(c=>c.status==='pending');
  const rejectedCI = allCI.filter(c=>c.status==='rejected');
  const prod = production.filter(p=>p.date>=from && p.date<=to);
  const uniqueWorkers = new Set(approvedCI.map(c=>c.workerId||c.workerName));
  const totalOrders = prod.reduce((s,p)=>s+(p.orders||0),0);
  const totalSkus = prod.reduce((s,p)=>s+(p.skus||0),0);
  const totalPay = approvedCI.reduce((s,c)=>s+c.pay,0);

  const shifts = {
    morning:{orders:0,skus:0,workers:new Set(),orderWorkers:new Set(),checkins:0},
    night:{orders:0,skus:0,workers:new Set(),orderWorkers:new Set(),checkins:0},
    unspecified:{orders:0,skus:0,workers:new Set(),orderWorkers:new Set(),checkins:0}
  };
  // NOTE: "Workers" = everyone who logged ANY production task (picking, packing,
  // replenishment or putaway) in that shift. "Orders"/"SKUs"/avg only come from
  // picking + packing entries (replenishment & putaway use qty, not orders), and
  // the average is divided by orderWorkers — the subset who actually logged an
  // order-producing task — so workers who only did replenishment/putaway don't
  // wrongly drag the "avg orders/worker" figure down.
  prod.forEach(p=>{
    const k = p.shift==='morning'?'morning':p.shift==='night'?'night':'unspecified';
    const key = p.workerId||p.workerName;
    shifts[k].workers.add(key);
    const tt = getTaskType(p);
    if(tt==='picking'||tt==='packing'){
      shifts[k].orders += p.orders||0;
      shifts[k].skus += p.skus||0;
      shifts[k].orderWorkers.add(key);
    }
  });
  approvedCI.forEach(c=>{ const k = c.shift==='morning'?'morning':c.shift==='night'?'night':'unspecified'; shifts[k].checkins++; });

  const workerMap = {};
  prod.forEach(p=>{
    const key=p.workerId||p.workerName;
    if(!workerMap[key]) workerMap[key] = {name:p.workerName,orders:0,skus:0,entries:0};
    workerMap[key].orders += p.orders||0;
    workerMap[key].skus += p.skus||0;
    workerMap[key].entries++;
  });

  const dailyMap = {};
  approvedCI.forEach(c=>{
    if(!dailyMap[c.date]) dailyMap[c.date] = {date:c.date,checkins:0,workers:new Set(),orders:0,skus:0,pay:0,picked:0,packed:0};
    dailyMap[c.date].checkins++; dailyMap[c.date].workers.add(c.workerId||c.workerName); dailyMap[c.date].pay += c.pay;
  });
  prod.forEach(p=>{
    if(!dailyMap[p.date]) dailyMap[p.date] = {date:p.date,checkins:0,workers:new Set(),orders:0,skus:0,pay:0,picked:0,packed:0};
    dailyMap[p.date].orders += p.orders||0; dailyMap[p.date].skus += p.skus||0;
    const tt = getTaskType(p);
    if(tt==='picking') dailyMap[p.date].picked += p.orders||0;
    if(tt==='packing') dailyMap[p.date].packed += p.orders||0;
  });

  // ---- Task-type breakdown: picking, packing, replenishment, putaway ----
  const taskTotals = {
    picking:{orders:0,skus:0,entries:0},
    packing:{orders:0,skus:0,entries:0},
    replenishment:{qty:0,entries:0},
    putaway:{qty:0,entries:0}
  };
  prod.forEach(p=>{
    const tt = getTaskType(p);
    if(!taskTotals[tt]) return;
    taskTotals[tt].entries++;
    if(tt==='picking' || tt==='packing'){ taskTotals[tt].orders += p.orders||0; taskTotals[tt].skus += p.skus||0; }
    else { taskTotals[tt].qty += p.qty||0; }
  });

  // ---- Packing log: every packed batch, with the exact time it became ready for dispatch ----
  const packingLog = prod.filter(p=>getTaskType(p)==='packing')
    .map(p=>({workerName:p.workerName, customer:p.customer||'', date:p.date, time:p.time, orders:p.orders||0, skus:p.skus||0, weight:p.weight||0, cartons:p.cartons||0, dispatch3PL:p.dispatch3PL||'', marketRegion:p.marketRegion||'', pickupAt:p.pickupAt||'', createdAt:p.createdAt}))
    .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));

  // ---- Dispatch & fulfillment: status, average time from packed to picked up, and breakdowns by region / 3PL ----
  const dispatched = packingLog.filter(p=>p.pickupAt);
  const pending = packingLog.filter(p=>!p.pickupAt);
  const previousPending = pending.filter(p=>p.date!==today());
  let dispatchHoursTotal = 0, dispatchHoursCount = 0;
  dispatched.forEach(p=>{
    if(!p.createdAt) return;
    const hrs = (new Date(p.pickupAt) - new Date(p.createdAt)) / 3600000;
    if(Number.isFinite(hrs) && hrs >= 0){ dispatchHoursTotal += hrs; dispatchHoursCount++; }
  });
  const avgDispatchHours = dispatchHoursCount ? dispatchHoursTotal / dispatchHoursCount : null;
  const byRegion = {}, by3PL = {};
  packingLog.forEach(p=>{
    const region = (p.marketRegion||'').trim() || 'Unassigned';
    if(!byRegion[region]) byRegion[region] = {batches:0, orders:0};
    byRegion[region].batches++; byRegion[region].orders += p.orders||0;
    const pl = (p.dispatch3PL||'').trim() || 'Unassigned';
    if(!by3PL[pl]) by3PL[pl] = {batches:0, orders:0};
    by3PL[pl].batches++; by3PL[pl].orders += p.orders||0;
  });
  const dispatch = {
    packedBatches: packingLog.length,
    dispatchedCount: dispatched.length,
    pendingCount: pending.length,
    previousPendingCount: previousPending.length,
    avgDispatchHours,
    byRegion, by3PL
  };

  const productivityLog = computeProductivityLog(prod, approvedCI);

  return {allCI, approvedCI, pendingCI, rejectedCI, prod, uniqueWorkers, totalOrders, totalSkus, totalPay, shifts, workerMap, dailyMap, taskTotals, packingLog, dispatch, productivityLog};
}

// ---- PRODUCTIVITY LOG: what each worker did, and roughly how long it took ----
// For each worker on each day, sort their production entries chronologically and
// take the time gap since their previous logged action (or since check-in, for
// the first task of the day) as an estimate of how long that task took.
function computeProductivityLog(prod, approvedCI){
  const byWorkerDate = {};
  prod.forEach(p=>{
    const key = (p.workerId||p.workerName)+'|'+p.date;
    if(!byWorkerDate[key]) byWorkerDate[key] = [];
    byWorkerDate[key].push(p);
  });
  const checkinTimeByWorkerDate = {};
  approvedCI.forEach(c=>{
    const key = (c.workerId||c.workerName)+'|'+c.date;
    if(c.checkinTime) checkinTimeByWorkerDate[key] = c.checkinTime;
  });
  const TASK_LABELS = {picking:'🧺 Picking', packing:'📦 Packing', replenishment:'🔄 Replenishment', putaway:'📥 Putaway'};
  const rows = [];
  Object.keys(byWorkerDate).forEach(key=>{
    const list = byWorkerDate[key].slice().sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
    let prevTime = checkinTimeByWorkerDate[key] ? new Date(checkinTimeByWorkerDate[key]) : null;
    list.forEach(p=>{
      const curTime = p.createdAt ? new Date(p.createdAt) : null;
      let durationMins = null;
      if(prevTime && curTime && !isNaN(prevTime.getTime()) && !isNaN(curTime.getTime())){
        durationMins = Math.max(0, Math.round((curTime - prevTime) / 60000));
      }
      const tt = getTaskType(p);
      rows.push({
        workerName: p.workerName,
        date: p.date,
        time: p.time || '',
        taskType: tt,
        taskLabel: TASK_LABELS[tt] || tt,
        orders: (tt==='picking'||tt==='packing') ? (p.orders||0) : (p.qty||0),
        skus: (tt==='picking'||tt==='packing') ? (p.skus||0) : null,
        durationMins,
        createdAt: p.createdAt || ''
      });
      if(curTime && !isNaN(curTime.getTime())) prevTime = curTime;
    });
  });
  rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return rows;
}
function formatDurationMins(mins){
  if(mins===null || mins===undefined) return '—';
  if(mins<60) return mins+'m';
  return Math.floor(mins/60)+'h '+(mins%60)+'m';
}

function renderLiveOps(){
  const t = today();
  const checkedInToday = checkins.filter(c=>c.date===t && c.status==='approved').length;
  const pendingApprovals = checkins.filter(c=>c.status==='pending').length;
  const ordersToday = orders.filter(o=>o.date===t).length;
  // Same fix as the Outbound tab: read picked/packed "today" straight from the
  // orders collection (pickedAt/packedAt) rather than summing the production
  // log's free-text "orders" field, which also counts generic batches never
  // linked to a real order and made this disagree with the other order-based
  // cards on this same row.
  const pickedToday = orders.filter(o=>localDay(o.pickedAt)===t).length;
  const packedToday = orders.filter(o=>localDay(o.packedAt)===t).length;
  const pendingPickups = getAllPackingEntries().filter(p=>!p.pickupAt).length;
  // Today's orders not yet fully picked (still unassigned or in progress).
  const ordersRemainingToday = orders.filter(o=>o.date===t && orderStatus(o)!=='picked' && orderStatus(o)!=='packed').length;
  // Picked but not yet packed — a packing backlog, not scoped to today, since
  // an order picked yesterday and still unpacked is exactly the kind of thing
  // this snapshot should surface.
  const pickedNotPacked = getReadyToPackOrders().length;
  const el = document.getElementById('analytics-live');
  if(!el) return;
  el.className = 'stat-grid stat-grid-8';
  el.innerHTML =
    statMini('Orders today', ordersToday.toLocaleString()) +
    statMini('Picked today', pickedToday.toLocaleString()) +
    statMini('Orders remaining today', ordersRemainingToday.toLocaleString()) +
    statMini('Picked, not packed', pickedNotPacked.toLocaleString()) +
    statMini('Packed today', packedToday.toLocaleString()) +
    statMini('Pending dispatch', pendingPickups) +
    statMini('Checked in today', checkedInToday) +
    statMini('Pending approvals', pendingApprovals);
}

function buildOrdersDailyMap(from, to){
  const map = {};
  orders.filter(o=>o.date>=from && o.date<=to).forEach(o=>{
    if(!map[o.date]) map[o.date] = {date:o.date,total:0,picked:0,packed:0};
    map[o.date].total++;
    if(o.status==='picked' || o.status==='packed') map[o.date].picked++;
    if(o.status==='packed') map[o.date].packed++;
  });
  return map;
}

function bucketOrdersTrend(dailyMap, granularity){
  // dailyMap entries (from computeAnalytics) store the day's order count under
  // `orders`, not `total` — reading `d.total` here always returned undefined,
  // so the gray "Total" line on the orders trend chart was permanently flat
  // at zero and the trend badge always reported "Flat" regardless of actual
  // volume. `total` below refers to the bucket object this function builds,
  // which intentionally does use that name internally.
  const days = Object.values(dailyMap).filter(d=>d.orders||d.picked||d.packed).sort((a,b)=>a.date.localeCompare(b.date));
  if(!days.length) return [];
  if(granularity==='day'){
    return days.map(d=>({key:d.date,total:d.orders||0,picked:d.picked||0,packed:d.packed||0,
      label:new Date(d.date+'T00:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short'})}));
  }
  if(granularity==='week'){
    const wk = {};
    days.forEach(d=>{
      const dt = new Date(d.date+'T00:00:00'); const mon = new Date(dt); mon.setDate(dt.getDate()-((dt.getDay()+6)%7));
      const key = toLocalISO(mon);
      if(!wk[key]) wk[key] = {key,total:0,picked:0,packed:0};
      wk[key].total += d.orders||0; wk[key].picked += d.picked||0; wk[key].packed += d.packed||0;
    });
    return Object.values(wk).sort((a,b)=>a.key.localeCompare(b.key)).map(b=>({...b,
      label:'Wk of '+new Date(b.key+'T00:00:00').toLocaleDateString('en-NG',{day:'numeric',month:'short'})}));
  }
  if(granularity==='year'){
    const yr = {};
    days.forEach(d=>{
      const dt = new Date(d.date+'T00:00:00');
      const key = String(dt.getFullYear());
      if(!yr[key]) yr[key] = {key,total:0,picked:0,packed:0};
      yr[key].total += d.orders||0; yr[key].picked += d.picked||0; yr[key].packed += d.packed||0;
    });
    return Object.values(yr).sort((a,b)=>a.key.localeCompare(b.key)).map(b=>({...b, label:b.key}));
  }
  // month
  const mo = {};
  days.forEach(d=>{
    const dt = new Date(d.date+'T00:00:00');
    const key = dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0');
    if(!mo[key]) mo[key] = {key,total:0,picked:0,packed:0};
    mo[key].total += d.orders||0; mo[key].picked += d.picked||0; mo[key].packed += d.packed||0;
  });
  return Object.values(mo).sort((a,b)=>a.key.localeCompare(b.key)).map(b=>{
    const [y,m] = b.key.split('-');
    return {...b, label: new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-NG',{month:'short',year:'2-digit'})};
  });
}

function renderOrdersTrendChart(buckets){
  if(!buckets.length) return '<div class="empty-state" style="padding:20px"><i class="ti ti-chart-line"></i>No orders logged for this period yet</div>';
  const W = 800, H = 200, padL = 34, padR = 12, padT = 12, padB = 26;
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const max = Math.max(1, ...buckets.map(b=>Math.max(b.total,b.picked,b.packed)));
  const stepX = buckets.length>1 ? innerW/(buckets.length-1) : 0;
  const xFor = i => padL + (buckets.length>1 ? i*stepX : innerW/2);
  const yFor = v => padT + innerH - (v/max*innerH);
  const pathFor = key => buckets.map((b,i)=>(i===0?'M':'L')+xFor(i).toFixed(1)+','+yFor(b[key]).toFixed(1)).join(' ');
  const dotsFor = (key,color) => buckets.map((b,i)=>'<circle cx="'+xFor(i).toFixed(1)+'" cy="'+yFor(b[key]).toFixed(1)+'" r="3" fill="'+color+'"><title>'+b.label+': '+b[key].toLocaleString()+' '+key+'</title></circle>').join('');
  const gridLines = [0,0.25,0.5,0.75,1].map(f=>{
    const y = padT+innerH-(f*innerH);
    const val = Math.round(max*f);
    return '<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--border2)" stroke-width="1" stroke-dasharray="2,3"/>'+
      '<text x="'+(padL-6)+'" y="'+(y+3)+'" font-size="9" fill="var(--text3)" text-anchor="end">'+val+'</text>';
  }).join('');
  const labelEvery = Math.max(1, Math.ceil(buckets.length/8));
  const xLabels = buckets.map((b,i)=> i%labelEvery===0 ? '<text x="'+xFor(i).toFixed(1)+'" y="'+(H-8)+'" font-size="9" fill="var(--text3)" text-anchor="middle">'+b.label+'</text>' : '').join('');
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:200px;display:block">'+
    gridLines +
    '<path d="'+pathFor('total')+'" fill="none" stroke="#6b7280" stroke-width="2"/>'+
    '<path d="'+pathFor('picked')+'" fill="none" stroke="#f59e0b" stroke-width="2"/>'+
    '<path d="'+pathFor('packed')+'" fill="none" stroke="#22c55e" stroke-width="2"/>'+
    dotsFor('total','#6b7280') + dotsFor('picked','#f59e0b') + dotsFor('packed','#22c55e') +
    xLabels +
  '</svg>';
}

// Compares the first half of the visible buckets to the second half (smoother
// and more reliable than just comparing the first vs. last single bucket) to
// say whether the period is trending up, down, or holding flat.
function computeTrendDirection(buckets, key){
  if(buckets.length < 2) return null;
  const mid = Math.ceil(buckets.length/2);
  const firstHalf = buckets.slice(0, mid);
  const secondHalf = buckets.slice(mid);
  const firstAvg = firstHalf.reduce((s,b)=>s+(b[key]||0),0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s,b)=>s+(b[key]||0),0) / secondHalf.length;
  if(firstAvg===0 && secondAvg===0) return {dir:'flat', pct:0};
  const pct = firstAvg!==0 ? Math.round(((secondAvg-firstAvg)/firstAvg)*100) : 100;
  const dir = Math.abs(pct) < 3 ? 'flat' : (pct > 0 ? 'up' : 'down');
  return {dir, pct};
}

function updateTrendGranButtons(){
  ['day','week','month','year'].forEach(k=>{
    const el = document.getElementById('trend-gran-'+k);
    if(el){ el.style.background = trendGranularity===k?'var(--bg2)':'var(--bg)'; el.style.fontWeight = trendGranularity===k?'600':'500'; }
  });
}

function setTrendGranularity(g){
  trendGranularity = g;
  const from = document.getElementById('analytics-from').value || today();
  const to = document.getElementById('analytics-to').value || today();
  renderTrendSection(null, from, to);
}

function renderTrendSection(dailyMap, from, to){
  updateTrendGranButtons();
  from = from || document.getElementById('analytics-from').value || today();
  to = to || document.getElementById('analytics-to').value || today();
  // dailyMap comes from computeAnalytics() (built from actual picking/packing
  // logs). Recompute it when not supplied, e.g. when just switching granularity.
  if(!dailyMap) dailyMap = computeAnalytics(from, to).dailyMap;
  const buckets = bucketOrdersTrend(dailyMap, trendGranularity);
  const chartEl = document.getElementById('analytics-trend-chart');
  if(chartEl){
    // Quick fade-out/in when switching range or granularity so the chart
    // never just "pops" to new numbers — small but noticeable polish.
    chartEl.style.opacity = '0';
    setTimeout(()=>{
      chartEl.innerHTML = renderOrdersTrendChart(buckets);
      chartEl.style.opacity = '1';
    }, 120);
  }

  const trend = computeTrendDirection(buckets, 'total');
  const badgeEl = document.getElementById('analytics-trend-badge');
  if(badgeEl){
    if(!trend){ badgeEl.style.display = 'none'; }
    else{
      badgeEl.style.display = 'inline-flex';
      const color = trend.dir==='up'?'var(--green-text)':trend.dir==='down'?'var(--red-text)':'var(--text2)';
      const bg = trend.dir==='up'?'var(--green-bg)':trend.dir==='down'?'var(--red-bg)':'var(--bg2)';
      const border = trend.dir==='up'?'var(--green-border)':trend.dir==='down'?'var(--red-border)':'var(--border2)';
      const icon = trend.dir==='up'?'ti-trending-up':trend.dir==='down'?'ti-trending-down':'ti-minus';
      const text = trend.dir==='flat' ? 'Flat — steady volume' : (trend.dir==='up' ? 'Rising '+Math.abs(trend.pct)+'%' : 'Falling '+Math.abs(trend.pct)+'%');
      badgeEl.style.background = bg; badgeEl.style.color = color; badgeEl.style.borderColor = border;
      badgeEl.innerHTML = '<i class="ti '+icon+'"></i> '+text+' <span style="opacity:0.7;font-weight:400">(orders, vs. first half of period)</span>';
    }
  }
}

function comparisonCard(label, cur, prev, fmt){
  fmt = fmt || (v=>v.toLocaleString());
  const diff = cur - prev;
  const flat = diff === 0, up = diff > 0;
  const color = flat ? 'var(--text2)' : (up ? 'var(--green-text)' : 'var(--red-text)');
  const icon = flat ? 'ti-minus' : (up ? 'ti-trending-up' : 'ti-trending-down');
  let sub, pctBadge;
  if(flat){
    sub = prev===0 ? 'No activity in either period' : 'No change';
    pctBadge = '±0%';
  } else if(prev===0){
    sub = 'No prior period data';
    pctBadge = 'New';
  } else {
    const pct = Math.round((diff/prev)*100);
    sub = (up?'increase':'decrease')+' vs prior period';
    pctBadge = (up?'+':'')+pct+'%';
  }
  // Deliberately distinct layout from the Overview stat cards: the headline
  // number here is the CHANGE (%), with current vs previous shown underneath,
  // so this section doesn't just look like a repeat of the Overview totals.
  return '<div class="stat-card"><div class="stat-label">'+label+'</div>'+
    '<div class="stat-value" style="color:'+color+'">'+pctBadge+'</div>'+
    '<div style="font-size:11px;color:'+color+';margin-top:2px;display:flex;align-items:center;justify-content:center;gap:3px"><i class="ti '+icon+'"></i>'+sub+'</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:6px;border-top:0.5px solid var(--border2);padding-top:6px">'+fmt(cur)+' now <span style="opacity:0.6">·</span> '+fmt(prev)+' prior period</div>'+
    '</div>';
}

function renderAnalytics(){
  renderLiveOps();
  const from = document.getElementById('analytics-from').value || today();
  const to = document.getElementById('analytics-to').value || today();
  if(from > to){ showToast('"From" date must be before "To" date'); return; }
  const data = computeAnalytics(from, to);

  const statsEl = document.getElementById('analytics-stats');
  if(statsEl) statsEl.innerHTML =
    statMini('Total check-ins', data.allCI.length) +
    statMini('Approved', data.approvedCI.length) +
    statMini('Pending', data.pendingCI.length) +
    statMini('Unique workers (approved)', data.uniqueWorkers.size) +
    statMini('Total orders', data.totalOrders.toLocaleString()) +
    statMini('Total SKUs', data.totalSkus.toLocaleString()) +
    statMini('Total pay ('+currencyLabel()+')', data.totalPay.toLocaleString()) +
    statMini('Avg orders / worker', data.uniqueWorkers.size ? Math.round(data.totalOrders/data.uniqueWorkers.size).toLocaleString() : '0') +
    statMini('Avg SKUs / order', data.totalOrders ? (data.totalSkus/data.totalOrders).toFixed(1) : '0');

  renderTrendSection(data.dailyMap, from, to);

  const shiftBody = document.getElementById('analytics-shift-body');
  if(shiftBody){
    const hasUnspecified = data.shifts.unspecified.workers.size>0 || data.shifts.unspecified.checkins>0;
    const rows = [['morning','Morning'],['night','Night']];
    if(hasUnspecified) rows.push(['unspecified','Not specified']);
    const note = document.getElementById('shift-unspecified-note');
    if(note) note.style.display = hasUnspecified ? 'block' : 'none';
    const combinedWorkers = new Set([...data.shifts.morning.workers, ...data.shifts.night.workers, ...data.shifts.unspecified.workers]).size;
    const combinedOrderWorkers = new Set([...data.shifts.morning.orderWorkers, ...data.shifts.night.orderWorkers, ...data.shifts.unspecified.orderWorkers]).size;
    let html = rows.map(([k,label])=>{
      const s = data.shifts[k];
      const avg = s.orderWorkers.size ? Math.round(s.orders/s.orderWorkers.size) : 0;
      const clickable = k!=='unspecified';
      return '<tr'+(clickable?' style="cursor:pointer" onclick="openShiftBreakdown(\''+k+'\')" title="Click for per-worker breakdown"':'')+'><td>'+label+(clickable?' <i class="ti ti-chevron-right" style="font-size:11px;color:var(--text3)"></i>':'')+'</td><td style="text-align:center">'+s.workers.size+'</td><td style="text-align:center">'+s.checkins+'</td><td style="text-align:right">'+s.orders.toLocaleString()+'</td><td style="text-align:right">'+s.skus.toLocaleString()+'</td><td style="text-align:right">'+avg.toLocaleString()+'</td></tr>';
    }).join('');
    const avgCombined = combinedOrderWorkers ? Math.round(data.totalOrders/combinedOrderWorkers) : 0;
    html += '<tr style="background:var(--bg2)"><td style="font-weight:600">Combined (both shifts)</td><td style="text-align:center;font-weight:600">'+combinedWorkers+'</td><td style="text-align:center;font-weight:600">'+data.approvedCI.length+'</td><td style="text-align:right;font-weight:600">'+data.totalOrders.toLocaleString()+'</td><td style="text-align:right;font-weight:600">'+data.totalSkus.toLocaleString()+'</td><td style="text-align:right;font-weight:600">'+avgCombined.toLocaleString()+'</td></tr>';
    shiftBody.innerHTML = html;
  }

  const taskBody = document.getElementById('analytics-task-body');
  if(taskBody){
    const labels = {picking:'🧺 Picking', packing:'📦 Packing', replenishment:'🔄 Replenishment', putaway:'📥 Putaway'};
    taskBody.innerHTML = Object.keys(labels).map(k=>{
      const tdata = data.taskTotals[k];
      const orders = (k==='picking'||k==='packing') ? tdata.orders.toLocaleString() : '—';
      const skusOrUnits = (k==='picking'||k==='packing') ? tdata.skus.toLocaleString() : tdata.qty.toLocaleString();
      return '<tr><td>'+labels[k]+'</td><td style="text-align:center">'+tdata.entries+'</td><td style="text-align:right">'+orders+'</td><td style="text-align:right">'+skusOrUnits+'</td></tr>';
    }).join('');
  }

  const workerBody = document.getElementById('analytics-worker-body');
  if(workerBody){
    const rows = Object.values(data.workerMap).sort((a,b)=>b.orders-a.orders).slice(0,10);
    workerBody.innerHTML = rows.length
      ? rows.map(w=>'<tr><td>'+w.name+'</td><td style="text-align:center">'+w.entries+'</td><td style="text-align:right">'+w.orders.toLocaleString()+'</td><td style="text-align:right">'+w.skus.toLocaleString()+'</td><td style="text-align:right">'+(w.orders?(w.skus/w.orders).toFixed(1):'0')+'</td></tr>').join('')
      : '<tr><td colspan="5"><div class="empty-state"><i class="ti ti-package"></i>No production logged in this period</div></td></tr>';
  }

  const dispatchStatsEl = document.getElementById('analytics-dispatch-stats');
  if(dispatchStatsEl){
    const avgHrs = data.dispatch.avgDispatchHours;
    dispatchStatsEl.innerHTML =
      statMini('Packed batches', data.dispatch.packedBatches) +
      statMini('Dispatched', data.dispatch.dispatchedCount) +
      statMini('Previous pending pickup', data.dispatch.previousPendingCount) +
      statMini('Total pending pickup', data.dispatch.pendingCount) +
      statMini('Avg time to dispatch', avgHrs===null ? '—' : (avgHrs<1 ? Math.round(avgHrs*60)+'m' : avgHrs.toFixed(1)+'h'));
  }

  const regionBody = document.getElementById('analytics-region-body');
  if(regionBody){
    const regions = Object.entries(data.dispatch.byRegion).sort((a,b)=>b[1].orders-a[1].orders);
    regionBody.innerHTML = regions.length
      ? regions.map(([name,r])=>'<tr><td>'+name+'</td><td style="text-align:center">'+r.batches+'</td><td style="text-align:right">'+r.orders.toLocaleString()+'</td></tr>').join('')
      : '<tr><td colspan="3"><div class="empty-state"><i class="ti ti-map-pin"></i>No packing logged in this period</div></td></tr>';
  }

  const plBody = document.getElementById('analytics-3pl-body');
  if(plBody){
    const pls = Object.entries(data.dispatch.by3PL).sort((a,b)=>b[1].orders-a[1].orders);
    plBody.innerHTML = pls.length
      ? pls.map(([name,r])=>'<tr><td>'+name+'</td><td style="text-align:center">'+r.batches+'</td><td style="text-align:right">'+r.orders.toLocaleString()+'</td></tr>').join('')
      : '<tr><td colspan="3"><div class="empty-state"><i class="ti ti-truck-delivery"></i>No packing logged in this period</div></td></tr>';
  }

  const packingLogBody = document.getElementById('analytics-packing-log-body');
  if(packingLogBody){
    const rows = data.packingLog.slice(0, 50);
    packingLogBody.innerHTML = rows.length
      ? rows.map(p=>'<tr><td>'+p.workerName+'</td><td>'+(p.customer||'—')+'</td><td>'+p.date+'</td><td>'+p.time+'</td><td style="text-align:right">'+p.orders.toLocaleString()+'</td><td style="text-align:right">'+p.skus.toLocaleString()+'</td><td style="text-align:right">'+(p.weight?p.weight+'kg':'—')+'</td><td style="text-align:right">'+(p.cartons||'—')+'</td><td>'+(p.dispatch3PL||'—')+'</td><td>'+(p.marketRegion||'—')+'</td><td>'+(p.pickupAt?'<span class="badge approved">Dispatched</span>':'<span class="badge pending">Pending</span>')+'</td></tr>').join('')
      : '<tr><td colspan="11"><div class="empty-state"><i class="ti ti-package"></i>No packing logged for this date</div></td></tr>';
  }

  const productivityBody = document.getElementById('analytics-productivity-body');
  if(productivityBody){
    const rows = data.productivityLog.slice(0, 100);
    productivityBody.innerHTML = rows.length
      ? rows.map(r=>'<tr><td>'+r.workerName+'</td><td>'+r.date+'</td><td>'+(r.time||'—')+'</td><td>'+r.taskLabel+'</td><td style="text-align:right">'+r.orders.toLocaleString()+'</td><td style="text-align:right">'+(r.skus===null?'—':r.skus.toLocaleString())+'</td><td style="text-align:right">'+formatDurationMins(r.durationMins)+'</td></tr>').join('')
      : '<tr><td colspan="7"><div class="empty-state"><i class="ti ti-activity"></i>No production logged in this period</div></td></tr>';
  }

  ['today','week','month','year','all'].forEach(k=>{
    const el = document.getElementById('arange-'+k);
    if(el){ el.style.background = analyticsRangeType===k?'var(--bg2)':'var(--bg)'; el.style.fontWeight = analyticsRangeType===k?'600':'500'; }
  });
}

function parseTimeToMinutes(t){
  if(!t) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if(m){
    let h = parseInt(m[1],10);
    const min = parseInt(m[2],10);
    const ap = m[3].toUpperCase();
    if(ap==='PM' && h!==12) h+=12;
    if(ap==='AM' && h===12) h=0;
    return h*60+min;
  }
  // Fallback: plain 24-hour "HH:MM" with no AM/PM marker — some browsers/webviews
  // with reduced ICU data silently ignore the hour12 option and print 24-hour time,
  // which would otherwise make every entry fail to match and the report look empty.
  const m24 = String(t).match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if(m24){
    const h = parseInt(m24[1],10), min = parseInt(m24[2],10);
    if(h>=0 && h<24 && min>=0 && min<60) return h*60+min;
  }
  return null;
}
// Best-effort minutes-of-day for a production entry: prefer the logged "time"
// string, but fall back to createdAt (always a well-formed ISO timestamp) so a
// malformed/locale-quirky time string doesn't cause an entry to silently drop
// out of time-windowed reports like "Orders 12pm–4pm".
function getEntryMinutes(p){
  const fromTime = parseTimeToMinutes(p.time);
  if(fromTime!==null) return fromTime;
  if(p.createdAt){
    const d = new Date(p.createdAt);
    if(!isNaN(d.getTime())) return d.getHours()*60 + d.getMinutes();
  }
  return null;
}

// ---- SHIFT BREAKDOWN MODAL ----
function openShiftBreakdown(shiftKey){
  const from = document.getElementById('analytics-from').value || today();
  const to = document.getElementById('analytics-to').value || today();
  const data = computeAnalytics(from, to);
  const prod = data.prod.filter(p=>{
    const k = p.shift==='morning'?'morning':p.shift==='night'?'night':'unspecified';
    return k===shiftKey;
  });
  const byWorker = {};
  prod.forEach(p=>{
    const key = p.workerId||p.workerName;
    if(!byWorker[key]) byWorker[key] = {name:p.workerName, picking:0, packing:0, replenishment:0, putaway:0};
    const tt = getTaskType(p);
    if(tt==='picking') byWorker[key].picking += p.orders||0;
    else if(tt==='packing') byWorker[key].packing += p.orders||0;
    else if(tt==='replenishment') byWorker[key].replenishment += p.qty||0;
    else if(tt==='putaway') byWorker[key].putaway += p.qty||0;
  });
  const rows = Object.values(byWorker).sort((a,b)=>(b.picking+b.packing)-(a.picking+a.packing));
  document.getElementById('shift-breakdown-title').textContent = (SHIFTS[shiftKey]?SHIFTS[shiftKey].label:'Shift') + ' — breakdown';
  document.getElementById('shift-breakdown-sub').textContent = 'Per-worker totals for '+from+' to '+to+' (Orders shown for picking/packing; units shown for replenishment/putaway)';
  const body = document.getElementById('shift-breakdown-body');
  body.innerHTML = rows.length
    ? rows.map(w=>'<tr><td>'+w.name+'</td><td style="text-align:center">'+(w.picking?w.picking.toLocaleString():'—')+'</td><td style="text-align:center">'+(w.packing?w.packing.toLocaleString():'—')+'</td><td style="text-align:center">'+(w.replenishment?w.replenishment.toLocaleString():'—')+'</td><td style="text-align:center">'+(w.putaway?w.putaway.toLocaleString():'—')+'</td><td style="text-align:right">'+(w.picking+w.packing).toLocaleString()+'</td></tr>').join('')
    : '<tr><td colspan="6"><div class="empty-state"><i class="ti ti-users"></i>No production logged for this shift in the selected range</div></td></tr>';
  document.getElementById('shift-breakdown-modal').classList.remove('hidden');
}
function closeShiftBreakdown(){ document.getElementById('shift-breakdown-modal').classList.add('hidden'); }

// ---- 12PM–4PM ORDERS REPORT ----
function openMiddayReport(){
  const from = document.getElementById('analytics-from').value || today();
  const to = document.getElementById('analytics-to').value || today();
  const data = computeAnalytics(from, to);
  const START = 12*60, END = 16*60; // 12:00 PM – 4:00 PM
  const rows = data.prod.filter(p=>{
    const tt = getTaskType(p);
    if(tt!=='picking' && tt!=='packing') return false;
    const mins = getEntryMinutes(p);
    return mins!==null && mins>=START && mins<=END;
  }).sort((a,b)=>(getEntryMinutes(a)||0)-(getEntryMinutes(b)||0));
  const pickOrders = rows.filter(p=>getTaskType(p)==='picking').reduce((s,p)=>s+(p.orders||0),0);
  const packOrders = rows.filter(p=>getTaskType(p)==='packing').reduce((s,p)=>s+(p.orders||0),0);
  const totalOrders = pickOrders + packOrders;
  const totalSkus = rows.reduce((s,p)=>s+(p.skus||0),0);
  document.getElementById('midday-report-sub').textContent = 'Picking & packing batches logged between 12:00 PM and 4:00 PM, for '+from+' to '+to;
  document.getElementById('midday-report-stats').innerHTML =
    statMini('Orders picked', pickOrders.toLocaleString()) +
    statMini('Orders packed', packOrders.toLocaleString()) +
    statMini('Total orders', totalOrders.toLocaleString()) +
    statMini('Total SKUs', totalSkus.toLocaleString());
  const body = document.getElementById('midday-report-body');
  body.innerHTML = rows.length
    ? rows.map(p=>'<tr><td>'+p.workerName+'</td><td>'+(getTaskType(p)==='picking'?'🧺 Picking':'📦 Packing')+'</td><td>'+p.time+'</td><td style="text-align:right">'+(p.orders||0).toLocaleString()+'</td><td style="text-align:right">'+(p.skus||0).toLocaleString()+'</td></tr>').join('')
    : '<tr><td colspan="5"><div class="empty-state"><i class="ti ti-clock-hour-4"></i>No picking or packing logged between 12pm–4pm in this range</div></td></tr>';
  document.getElementById('midday-report-modal').classList.remove('hidden');
}
function closeMiddayReport(){ document.getElementById('midday-report-modal').classList.add('hidden'); }

let packingLogVisible = false;
function togglePackingLog(){
  packingLogVisible = !packingLogVisible;
  const wrap = document.getElementById('analytics-packing-log-wrap');
  const label = document.getElementById('packing-log-toggle-label');
  if(wrap) wrap.style.display = packingLogVisible ? 'block' : 'none';
  if(label) label.textContent = packingLogVisible ? 'Hide packing log' : 'Show packing log';
}

function downloadAnalyticsExcel(){
  if(typeof XLSX==='undefined'){ showToast('Excel library failed to load — check your connection'); return; }
  const from = document.getElementById('analytics-from').value || today();
  const to = document.getElementById('analytics-to').value || today();
  const data = computeAnalytics(from, to);
  const wb = XLSX.utils.book_new();

  const summary = [
    {Metric:'Date range', Value: from+' to '+to},
    {Metric:'Total check-ins (approved)', Value: data.approvedCI.length},
    {Metric:'Unique workers', Value: data.uniqueWorkers.size},
    {Metric:'Total orders processed', Value: data.totalOrders},
    {Metric:'Total SKUs processed', Value: data.totalSkus},
    {Metric:'Total pay ('+currencyLabel()+')', Value: data.totalPay},
    {Metric:'Avg orders per worker', Value: data.uniqueWorkers.size ? Math.round(data.totalOrders/data.uniqueWorkers.size) : 0},
    {Metric:'Avg SKUs per order', Value: data.totalOrders ? Number((data.totalSkus/data.totalOrders).toFixed(2)) : 0},
    {Metric:'Packed batches', Value: data.dispatch.packedBatches},
    {Metric:'Dispatched', Value: data.dispatch.dispatchedCount},
    {Metric:'Previous pending pickup', Value: data.dispatch.previousPendingCount},
    {Metric:'Total pending pickup', Value: data.dispatch.pendingCount},
    {Metric:'Avg time to dispatch (hours)', Value: data.dispatch.avgDispatchHours===null ? '' : Number(data.dispatch.avgDispatchHours.toFixed(2))}
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

  const taskRows = [
    {Task:'Picking', Entries: data.taskTotals.picking.entries, Orders: data.taskTotals.picking.orders, SKUs: data.taskTotals.picking.skus, 'Units (replenish/putaway)':''},
    {Task:'Packing', Entries: data.taskTotals.packing.entries, Orders: data.taskTotals.packing.orders, SKUs: data.taskTotals.packing.skus, 'Units (replenish/putaway)':''},
    {Task:'Replenishment', Entries: data.taskTotals.replenishment.entries, Orders:'', SKUs:'', 'Units (replenish/putaway)': data.taskTotals.replenishment.qty},
    {Task:'Putaway', Entries: data.taskTotals.putaway.entries, Orders:'', SKUs:'', 'Units (replenish/putaway)': data.taskTotals.putaway.qty}
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), 'Task Breakdown');

  const regionRows = Object.entries(data.dispatch.byRegion).sort((a,b)=>b[1].orders-a[1].orders).map(([name,r])=>({
    Region: name, Batches: r.batches, Orders: r.orders
  }));
  const plRows = Object.entries(data.dispatch.by3PL).sort((a,b)=>b[1].orders-a[1].orders).map(([name,r])=>({
    '3PL': name, Batches: r.batches, Orders: r.orders
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regionRows.length?regionRows:[{Region:'',Batches:'',Orders:''}]), 'By Region');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plRows.length?plRows:[{'3PL':'',Batches:'',Orders:''}]), 'By 3PL');

  const packingLogRows = data.packingLog.map(p=>({
    Worker: p.workerName, Customer: p.customer, Date: p.date, 'Time ready for dispatch': p.time, Orders: p.orders, SKUs: p.skus,
    'Weight (kg)': p.weight, Cartons: p.cartons, '3PL': p.dispatch3PL, 'Market Region': p.marketRegion,
    'Picked up at': p.pickupAt ? new Date(p.pickupAt).toLocaleString('en-US',{hour12:true}) : '', Status: p.pickupAt ? 'Dispatched' : 'Pending'
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(packingLogRows.length?packingLogRows:[{Worker:'',Customer:'',Date:'','Time ready for dispatch':'',Orders:'',SKUs:'','Weight (kg)':'',Cartons:'','3PL':'','Market Region':'','Picked up at':'',Status:''}]), 'Packing Log');

  const productivityRows = data.productivityLog.map(r=>({
    Worker: r.workerName, Date: r.date, Time: r.time, Task: r.taskType.charAt(0).toUpperCase()+r.taskType.slice(1),
    'Orders / Qty': r.orders, SKUs: r.skus===null?'':r.skus, 'Time taken': formatDurationMins(r.durationMins)
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productivityRows.length?productivityRows:[{Worker:'',Date:'',Time:'',Task:'','Orders / Qty':'',SKUs:'','Time taken':''}]), 'Productivity');

  const dailyRows = Object.values(data.dailyMap).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({
    Date: d.date, 'Unique Workers': d.workers.size, 'Check-ins': d.checkins, Orders: d.orders, SKUs: d.skus, ['Pay ('+currencyLabel()+')']: d.pay
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily Breakdown');

  const shiftRows = ['morning','night','unspecified'].map(k=>({
    Shift: k==='morning'?'Morning':k==='night'?'Night':'Not specified',
    'Unique Workers': data.shifts[k].workers.size, 'Check-ins': data.shifts[k].checkins, Orders: data.shifts[k].orders, SKUs: data.shifts[k].skus,
    'Avg Orders/Worker': data.shifts[k].orderWorkers.size ? Math.round(data.shifts[k].orders/data.shifts[k].orderWorkers.size) : 0
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftRows), 'Shift Breakdown');

  const workerRows = Object.values(data.workerMap).sort((a,b)=>b.orders-a.orders).map(w=>({
    Worker: w.name, 'Entries Logged': w.entries, Orders: w.orders, SKUs: w.skus, 'Avg SKUs per Order': w.orders ? Number((w.skus/w.orders).toFixed(2)) : 0
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workerRows), 'Worker Breakdown');

  XLSX.writeFile(wb, 'warehouse_analytics_'+from+'_to_'+to+'.xlsx');
  showToast('Analytics Excel downloaded');
}

function switchTab(name,el){
  if(name==='ledger'&&!currentAdmin){
    name='checkin';
    el=document.querySelector('.tab[onclick*="checkin"]');
  }
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  if(name==='ledger')renderLedger();
  if(name==='manage')renderManage();
  if(name==='approve')renderApprovals();
  if(name==='admins')renderAdmins();
  if(name==='sheets')renderSheetsSettings();
  if(name==='checkin')renderCheckin();
  if(name==='scanner')renderScanner();
  if(name==='reports')setReportsSubTab(reportsSubTab);
  if(name==='messages')renderMessages();
  if(name==='analytics')renderAnalytics();
  if(name==='outbound')renderOutbound();
  if(name==='orders')renderOrdersTab();
}

// ---- TOAST ----
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2800);
}

// ---- INIT ----
document.getElementById('date-badge').textContent=todayLabel();
const today2=today();
document.getElementById('filter-to').value=today2;
document.getElementById('filter-from').value=toLocalISO(new Date(Date.now()-30*86400000));
document.getElementById('new-start').value=today2;
document.getElementById('analytics-to').value=today2;
document.getElementById('analytics-from').value=toLocalISO(new Date(new Date().getFullYear(),new Date().getMonth(),1));
document.getElementById('fulfillment-from').value=toLocalISO(new Date(new Date().getFullYear(),new Date().getMonth(),1));
document.getElementById('fulfillment-to').value=today2;
initQrBubble();

// Built-in default config so new devices/browsers connect automatically
// without needing to paste the Firebase config manually. This is safe to
// include here: a Firebase web config is not a secret, access is controlled
// by the database security rules, not by hiding these values.
const DEFAULT_FIREBASE_CONFIG={
  apiKey: "AIzaSyC73BkYacYzYjOVrmkG7fJIat-qv59eoUU",
  authDomain: "warehouse-checkin-1c7e8.firebaseapp.com",
  databaseURL: "https://warehouse-checkin-1c7e8-default-rtdb.firebaseio.com",
  projectId: "warehouse-checkin-1c7e8",
  storageBucket: "warehouse-checkin-1c7e8.firebasestorage.app",
  messagingSenderId: "723651212725",
  appId: "1:723651212725:web:b9a0bbfa48ec819f8115fc",
  measurementId: "G-2XGQ5YMGDF"
};

// Check if Firebase already configured
const savedCfg=localStorage.getItem(CONFIG_KEY);
const forceSetup=new URLSearchParams(window.location.search).get('setup')==='1';
if(forceSetup){
  document.getElementById('setup-screen').classList.remove('hidden');
} else if(savedCfg){
  try{initFirebase(JSON.parse(savedCfg));}
  catch(e){
    localStorage.removeItem(CONFIG_KEY);
    // Fall back to the built-in config instead of showing the setup screen
    try{
      localStorage.setItem(CONFIG_KEY,JSON.stringify(DEFAULT_FIREBASE_CONFIG));
      initFirebase(DEFAULT_FIREBASE_CONFIG);
    }catch(e2){document.getElementById('setup-screen').classList.remove('hidden');}
  }
} else {
  try{
    localStorage.setItem(CONFIG_KEY,JSON.stringify(DEFAULT_FIREBASE_CONFIG));
    initFirebase(DEFAULT_FIREBASE_CONFIG);
  }catch(e){document.getElementById('setup-screen').classList.remove('hidden');}
}

setInterval(checkAutoSync,3600000);
setInterval(checkSlackAutoSend,300000);
checkSlackAutoSend();
renderAdminPermCheckboxes();
setInterval(renderOrdersTimers,1000);

// ---- ENTER-TO-SUBMIT ----
// The app's forms are plain divs (not <form> elements), so pressing Enter did
// nothing by default — only clicking the button worked. This makes Enter behave
// like clicking the relevant submit button, scoped to the nearest modal/card so
// it can't accidentally trigger an unrelated button elsewhere on the page.
const ENTER_SUBMIT_TYPES = ['text','password','number','date','datetime-local','email','tel','search'];
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  const el = e.target;
  if(!el || el.tagName !== 'INPUT') return;
  if(!ENTER_SUBMIT_TYPES.includes(el.type)) return;
  const scope = el.closest('.modal') || el.closest('.card');
  if(!scope) return;
  // Exclude task-type toggle buttons (production modal) which also carry the
  // "primary" class when active but aren't the actual submit action.
  const candidates = scope.querySelectorAll('.btn.primary:not(.task-type-btn):not(:disabled), .btn.success:not(.task-type-btn):not(:disabled)');
  if(!candidates.length) return;
  const btn = candidates[candidates.length-1];
  e.preventDefault();
  btn.click();
});

// ---- PWA SERVICE WORKER ----
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ---- PWA INSTALL PROMPT ----
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  showInstallBanner();
});
function showInstallBanner(){
  if(document.getElementById('install-banner'))return;
  const banner=document.createElement('div');
  banner.id='install-banner';
  banner.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);border-radius:12px;padding:12px 20px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:12px;z-index:8888;box-shadow:0 4px 20px rgba(0,0,0,0.3);white-space:nowrap';
  banner.innerHTML='🏭 Install app on your phone <button onclick="installApp()" style="background:#fff;color:#1a1a18;border:none;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer">Install</button><button onclick="document.getElementById(\'install-banner\').remove()" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:18px;padding:0 4px">×</button>';
  document.body.appendChild(banner);
}
function installApp(){
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(()=>{deferredPrompt=null;const b=document.getElementById('install-banner');if(b)b.remove();});
}
window.addEventListener('appinstalled',()=>{showToast('✓ App installed successfully!');})
