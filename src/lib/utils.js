


export const openLink = (url) => {
    try {
        window.flutter_inappwebview.callHandler("deepLink", url);
    } catch (e) {
        window.open(url, "_self");
        console.log(e);
    }
};


export const nativeBACK = () => {
    try {
        window.flutter_inappwebview.callHandler("BACK", "BACK");
    } catch (e) {
        console.log(e);
    }
}



export const BANKLIST = [{
    id: 1,
    name: "Axis Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/axis_bank.png"
},
{
    id: 2,
    name: "Bank of Baroda",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Bank+of+Baroda.png"
},
{
    id: 3,
    name: "Bank of India",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Bank+of+India.png"
},
{
    id: 4,
    name: "Bank of Maharashtra",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Bank+of+Maharashtra.png"
},
{
    id: 5,
    name: "BNP Paribas",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/bnp_paribas.png"
},
{
    id: 6,
    name: "Canara Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Canara+Bank.png"
},
{
    id: 7,
    name: "Catholic Syrian Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/catholic_syrian_bank.png"
},
{
    id: 8,
    name: "Central Bank of India",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Central+Bank+of+India.png"
},
{
    id: 9,
    name: "Citi Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Citi+Bank.png"
},
{
    id: 10,
    name: "Development Bank of Singapore",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/DBS.png"
},
{
    id: 11,
    name: "DCB Bank Ltd.",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/dcb_bank.png"
},
{
    id: 12,
    name: "Dhanalakshmi Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/dhanlaxmi_bank.png"
},
{
    id: 13,
    name: "Federal Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Federal.png"
},
{
    id: 14,
    name: "HDFC Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/HDFC.png"
},
{
    id: 15,
    name: "HSBC Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/HSBC.png"
},
{
    id: 16,
    name: "ICICI Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/ICICI.png"
},
{
    id: 17,
    name: "IDBI Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/IDBI.png"
},
{
    id: 18,
    name: "Indian Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/IDFC.png"
},
{
    id: 19,
    name: "Indian Overseas Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Indian+Overseas+Bank.png"
},
{
    id: 20,
    name: "Induslnd Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/IndusInd.png"
},
{
    id: 21,
    name: "Jammu And Kashmir Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Jammu_%2526_kashmir_bank.png"
},
{
    id: 22,
    name: "Karnataka Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/karnataka_bank.png"
},
{
    id: 23,
    name: "Karur Vysya Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Karur+Vysya.png"
},
{
    id: 24,
    name: "Kotak Mahindra Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Kotak+Mahindra.png"
},
{
    id: 25,
    name: "Punjab National Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/PNB.png"
},
{
    id: 26,
    name: "South Indian Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/South+Indian+Bank.png"
},
{
    id: 27,
    name: "Standard Chartered Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Standard+Chartered.png"
},
{
    id: 28,
    name: "State Bank of India",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/SBI.png"
},
{
    id: 29,
    name: "Tamilnaad Mercantile Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/TMB.png"
},
{
    id: 30,
    name: "UCO Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/UCO+Bank.png"
},
{
    id: 31,
    name: "Union Bank Of India",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/Union+Bank.png"
},
{
    id: 32,
    name: "Yes Bank Ltd",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/yes_bank.png"
},
{
    id: 33,
    name: "Ratnakar Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/RBL.png"
},
{
    id: 34,
    name: "Punjab and Sind Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/punjab_%2526_sind_bank.png"
},
{
    id: 35,
    name: "City Union Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/city_union_bank.png"
},
{
    id: 36,
    name: "Bandhan Bank limited",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/bandhan_bank.png"
},
{
    id: 37,
    name: "IDFC bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/IDFC.png"
},
{
    id: 38,
    name: "Barclays Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/barclays_bank.png"
},
{
    id: 39,
    name: "Airtel Payments Bank Ltd.",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/airtel_payments_bank.png"
},
{
    id: 40,
    name: "Fino Payments Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/fino_Payments_bank.png"
},
{
    id: 41,
    name: "Paytm Payments Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/paytm_Payments_bank.png"
},
{
    id: 42,
    name: "India Post Payments bank Limited",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/indian_post_Payments_bank.png"
},
{
    id: 43,
    name: "Emirates NBD Bank (P J S C)",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/emirates_nbd_bank.png"
},
{
    id: 44,
    name: "JIO Payments Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/jio_payments_bank.png"
},
{
    id: 45,
    name: "NSDL PAYMENTS BANK LTD",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/nsdl_payments_bank.png"
},
{
    id: 46,
    name: "Shinhan Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/shinhan_bank.png"
},
{
    id: 47,
    name: "Bank of America",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/bank_of_america.png"
},
{
    id: 48,
    name: "SBM BANK (INDIA) LIMITED",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/sbm_bank.png"
},
{
    id: 49,
    name: "Bank of Bahrain and Kuwait B.S.C",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/bank_of_bahrain_%2526_kuwait.png"
},
{
    id: 50,
    name: "Credit Agricole Corporate & Investment Bank",
    url: "https://storage.googleapis.com/app-assets-univest/react-assets/banks/credit_agricole_corporate.png"
}
]