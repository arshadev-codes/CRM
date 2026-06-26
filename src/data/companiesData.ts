export interface Company {
  id: string;
  companyFullName: string;
  companyShortName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  gst: string;
  contactPerson?: string;
  designation?: string;
  mobile?: string;
  email?: string;
}

export const companiesData: Company[] = [
  {
    id: "ptcl",
    companyFullName: "Power Transmission Corporation Limited",
    companyShortName: "PTCL",
    address: "Plot 12, Industrial Area Phase II",
    city: "Gurugram", state: "Haryana", country: "India",
    gst: "06AAACP1234A1Z5",
    contactPerson: "Rajesh Sharma", designation: "Chief Engineer",
    mobile: "9810012345", email: "rajesh@ptcl.in",
  },
  {
    id: "ngel",
    companyFullName: "National Grid Energy Limited",
    companyShortName: "NGEL",
    address: "Sector 24, Knowledge Park",
    city: "Noida", state: "Uttar Pradesh", country: "India",
    gst: "09AABCN5678B2Z9",
    contactPerson: "Anita Verma", designation: "Project Manager",
    mobile: "9818822233", email: "anita.verma@ngel.in",
  },
  {
    id: "tspl",
    companyFullName: "Tata Steel Power Limited",
    companyShortName: "TSPL",
    address: "Jamshedpur Works, Bistupur",
    city: "Jamshedpur", state: "Jharkhand", country: "India",
    gst: "20AAACT9988C1Z2",
    contactPerson: "Manoj Singh", designation: "DGM Electrical",
    mobile: "9430011223", email: "manoj.singh@tatasteel.com",
  },
  {
    id: "rinl",
    companyFullName: "Reliance Industries Network Limited",
    companyShortName: "RINL",
    address: "Maker Chambers IV, Nariman Point",
    city: "Mumbai", state: "Maharashtra", country: "India",
    gst: "27AAACR1122D1Z3",
    contactPerson: "Sunil Mehta", designation: "Sr. Manager",
    mobile: "9820011223", email: "sunil.mehta@ril.com",
  },
  {
    id: "lntp",
    companyFullName: "Larsen & Toubro Power Transmission",
    companyShortName: "L&T Power",
    address: "L&T House, Ballard Estate",
    city: "Mumbai", state: "Maharashtra", country: "India",
    gst: "27AAACL5544E1Z7",
    contactPerson: "Prakash Iyer", designation: "AVP Projects",
    mobile: "9821133445", email: "prakash.iyer@larsentoubro.com",
  },
  {
    id: "bhel",
    companyFullName: "Bharat Heavy Electricals Limited",
    companyShortName: "BHEL",
    address: "BHEL House, Siri Fort",
    city: "New Delhi", state: "Delhi", country: "India",
    gst: "07AAACB4146P1Z2",
    contactPerson: "Sandeep Rao", designation: "AGM",
    mobile: "9818877665", email: "sandeep.rao@bhel.in",
  },
  {
    id: "adani",
    companyFullName: "Adani Transmission Limited",
    companyShortName: "ATL",
    address: "Adani House, Shantigram",
    city: "Ahmedabad", state: "Gujarat", country: "India",
    gst: "24AAACA8901F1Z4",
    contactPerson: "Hardik Patel", designation: "Lead Engineer",
    mobile: "9824001122", email: "hardik.patel@adani.com",
  },
  {
    id: "pgcil",
    companyFullName: "Power Grid Corporation of India Limited",
    companyShortName: "PGCIL",
    address: "Saudamini, Plot No. 2, Sector 29",
    city: "Gurugram", state: "Haryana", country: "India",
    gst: "06AAACP0252G1Z1",
    contactPerson: "Vikram Anand", designation: "ED Substations",
    mobile: "9811223344", email: "vikram.anand@powergrid.in",
  },
  {
    id: "siemens",
    companyFullName: "Siemens Energy India Pvt. Ltd.",
    companyShortName: "Siemens Energy",
    address: "Kalpataru Square, Andheri East",
    city: "Mumbai", state: "Maharashtra", country: "India",
    gst: "27AAACS3456H1Z8",
    contactPerson: "Rohan Desai", designation: "Bid Manager",
    mobile: "9930011223", email: "rohan.desai@siemens-energy.com",
  },
  {
    id: "abb",
    companyFullName: "ABB India Limited",
    companyShortName: "ABB India",
    address: "Disha, Plot No. 5/3, Whitefield",
    city: "Bengaluru", state: "Karnataka", country: "India",
    gst: "29AAACA7890I1Z6",
    contactPerson: "Karthik Reddy", designation: "Sales Head",
    mobile: "9844001122", email: "karthik.reddy@in.abb.com",
  },
];
