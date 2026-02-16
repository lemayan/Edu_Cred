/**
 * Comprehensive list of Kenyan Universities and TVET Institutions
 * Used for the institution dropdown in the Issue Certificate form.
 */

export const UNIVERSITIES = [
    // Public Universities
    'University of Nairobi',
    'Kenyatta University',
    'Moi University',
    'Egerton University',
    'Jomo Kenyatta University of Agriculture and Technology',
    'Maseno University',
    'Masinde Muliro University of Science and Technology',
    'Dedan Kimathi University of Technology',
    'Chuka University',
    'Technical University of Kenya',
    'Technical University of Mombasa',
    'Pwani University',
    'Kisii University',
    'University of Eldoret',
    'Maasai Mara University',
    'Jaramogi Oginga Odinga University of Science and Technology',
    'Laikipia University',
    'South Eastern Kenya University',
    'Meru University of Science and Technology',
    'Multimedia University of Kenya',
    'University of Kabianga',
    'Karatina University',
    'Kibabii University',
    'University of Embu',
    'Kirinyaga University',
    'Machakos University',
    'Murang\'a University of Technology',
    'Rongo University',
    'Taita Taveta University',
    'Garissa University',
    'Co-operative University of Kenya',
    'Tharaka University',
    'Bomet University College',
    'Kaimosi Friends University College',
    'Tom Mboya University',
    'Alupe University',

    // Private Universities
    'Strathmore University',
    'United States International University - Africa',
    'Daystar University',
    'Africa Nazarene University',
    'Catholic University of Eastern Africa',
    'Pan Africa Christian University',
    'KCA University',
    'Mount Kenya University',
    'St. Paul\'s University',
    'Scott Christian University',
    'Kabarak University',
    'Kenya Methodist University',
    'Africa International University',
    'Adventist University of Africa',
    'Tangaza University College',
    'Riara University',
    'Zetech University',
    'Pioneer International University',
    'Management University of Africa',
    'Lukenya University',
    'Umma University',
    'Great Lakes University of Kisumu',
    'Gretsa University',
    'KAG East University',
    'International Leadership University',
    'Aga Khan University',
];

export const TVET_INSTITUTIONS = [
    // National Polytechnics
    'Kenya Polytechnic University College',
    'Mombasa Technical Training Institute',
    'Eldoret National Polytechnic',
    'Kisumu National Polytechnic',
    'The Kenya Coast National Polytechnic',
    'Nyeri National Polytechnic',
    'Kisii National Polytechnic',

    // Technical Training Institutes
    'Kiambu Institute of Science and Technology',
    'Thika Technical Training Institute',
    'Kabete National Polytechnic',
    'Nyandarua National Polytechnic',
    'Rift Valley Technical Training Institute',
    'Sigalagala National Polytechnic',
    'Ramogi Institute of Advanced Technology',
    'Kitale National Polytechnic',
    'Meru National Polytechnic',
    'Machakos Institute of Technology',
    'PC Kinyanjui Technical Training Institute',
    'Nairobi Technical Training Institute',
    'Kenya Institute of Mass Communication',
    'Kenya Institute of Highway and Building Technology',
    'Kenya Water Institute',
    'Bukura Agricultural College',
    'Sang\'alo Institute of Science and Technology',
    'Shamberere Technical Training Institute',
    'Nkabune Technical Training Institute',
    'Michuki Technical Training Institute',
    'Keroka Technical Training Institute',
    'Ol\'lessos Technical Training Institute',
    'Wote Technical Training Institute',
    'Bushiangala Technical Training Institute',
    'Katine Vocational Training Centre',
    'Mathenge Technical Training Institute',
    'Mukiria Technical Training Institute',
    'Narok TVET Centre',
    'Maasai Technical Training Institute',
    'Sotik Technical Training Institute',
    'Trans Nzoia TVET Centre',
];

export const EXAMINATION_BODIES = [
    'Kenya National Examinations Council (KNEC)',
    'Kenya Institute of Curriculum Development (KICD)',
    'Commission for University Education (CUE)',
    'TVET Authority (TVETA)',
];

// Combined list: bodies first, then universities, then TVETs
export const ALL_INSTITUTIONS = [
    ...EXAMINATION_BODIES,
    ...UNIVERSITIES,
    ...TVET_INSTITUTIONS,
];

/**
 * Search institutions by query string (case-insensitive, partial match)
 */
export function searchInstitutions(query) {
    if (!query || query.length < 1) return ALL_INSTITUTIONS.slice(0, 15);
    const q = query.toLowerCase();
    return ALL_INSTITUTIONS.filter((inst) => inst.toLowerCase().includes(q));
}
