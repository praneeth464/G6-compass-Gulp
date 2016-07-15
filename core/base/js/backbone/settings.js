/*jslint browser: true, nomen: true, devel: false, unparam: true*/
/*global
alert,
console,
$,
_,
Modernizr,
Handlebars,
_V_,
jHtmlArea,
G5:true
*/
//GLOBAL SETTINGS
//calculate the arrangements and geometry once only, cannot change geometry after arrangement loaded
G5 = {
    props:{},
    backbone:{},
    views:{}, // used for participant profile (in header - PageView)
    models:{},
    util:{}
};

G5.props.CACHE_MODULE_ARRANGEMENTS = true;
G5.props.DEFAULT_FILTER = 'home';
G5.props.PACK_WITH_ALT_DIMS = false;

//set this to ERROR for production
G5.props.LOG_LEVEL = 'INFO';// ERROR < INFO (only two modes atm)

//GLOBAL VARIABLES FOR CERTAIN UI CONSISTENCIES AND HELPERS
G5.props.ANIMATION_DURATION = 200; // milliseconds 200, 400, 600 (fast, normal, slow)
G5.props.CYCLE_SLIDE_TRANSITION_PAUSE = 4000; // 4000 is the jquery.cycle default
G5.props.SHOWLAYOUTBOXES = false;

//URLS
G5.props.URL_ROOT = './'; //CONTEXT PATH
G5.props.URL_APPS_ROOT = G5.props.URL_ROOT+'../apps/'; //APPS PATH (development only)
G5.props.URL_BASE_ROOT = G5.props.URL_ROOT+'./'; //BASE PATH (development only)
G5.props.URL_JHTML_STYLE = G5.props.URL_ROOT+'css/jhtmlArea.css'; //path for sticking in the jhtml css

//UNIFIED TEMPLATE DIRECTORY
G5.props.URL_TPL_ROOT = false;//'./tpl' //if set, this will be used for all template paths
G5.props.TMPL_SFFX = '.html'; // '.jsp', '.php', '.html'

//DEFAULTS FOR PAGENAV
G5.props.pageNavDefaults = {
    back : {
        text : 'Back',
        url : 'layout.html'
    },
    home : {
        text : 'Home',
        url : 'layout.html?tplPath=base/tpl/&amp;tpl=modulesPage.html'
    }
};

//VIDEOJS
_V_.options.flash.swf = "rsrc/video-js.swf";

// inform the server of a home app filter change
G5.props.URL_HOME_APP_FILTER_CHANGE = G5.props.URL_ROOT+'ajax/dummy.json';

// set the system debug value to true/valse
G5.props.URL_SET_SYSTEM_DEBUG = G5.props.URL_ROOT+'ajax/setSystemDebug.json';

//G5.props.URL_ON_THE_SPOT_CERT = 'ajax/onTheSpot_cert_error.json';//error
G5.props.URL_JSON_ON_THE_SPOT_CERT = G5.props.URL_ROOT+'ajax/onTheSpot_cert_success.json';//success

G5.props.URL_JSON_BUDGETS = G5.props.URL_ROOT+'ajax/budgetTracker.json';//budget items

G5.props.URL_JSON_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/leaderboardSetCollection.json';//all leaderboards
G5.props.URL_JSON_LEADERBOARD_MODEL = G5.props.URL_ROOT+'ajax/leaderboardModel.json';//specific leaderboard data

G5.props.URL_JSON_GAMIFICATION = G5.props.URL_ROOT+'ajax/gamification.json';//gamification items

G5.props.URL_JSON_GAMIFICATION_DETAIL = G5.props.URL_ROOT+'ajax/gamificationDetail.json';//gamification items

G5.props.URL_JSON_PLATEAU_AWARDS = G5.props.URL_ROOT+'ajax/browsePlateauAwards.json';//plateau awards (promo - levels - products)
G5.props.URL_JSON_PLATEAU_AWARDS_MODULE = G5.props.URL_ROOT+'ajax/modulePlateauAwards.json';//plateau awards (promo - levels - products)
// plateauAwardsPageView (JAVA override as necessary) -- required for Send a Rec. and GQ Edit (opens in a sheet view)
G5.props.URL_PAGE_PLATEAU_AWARDS = G5.props.URL_TPL_ROOT ? G5.props.URL_TPL_ROOT+'plateauAwardsPage.html' : G5.props.URL_APPS_ROOT+'plateauAwards/tpl/plateauAwardsPage.html';

G5.props.URL_JSON_PLATEAU_AWARDS_REDEEM = G5.props.URL_ROOT+'ajax/plateauAwardsRedeem.json';

G5.props.URL_JSON_PARTICIPANT_PROFILE = G5.props.URL_ROOT+'ajax/participantProfile.json';//current active user
G5.props.URL_JSON_PARTICIPANT_PROFILE_POINTS = G5.props.URL_ROOT+'ajax/participantProfilePoints.json';//current active user's points
G5.props.URL_JSON_PARTICIPANT_PROFILE_ALERTS = G5.props.URL_ROOT+'ajax/participantProfileAlerts.json';//curren active user's alerts

G5.props.URL_JSON_PARTICIPANT_GLOBAL_SEARCH_AUTOCOMPLETE = G5.props.URL_ROOT+'ajax/participantGlobalSearchResults.json'; //autocomplete data for global participant search
G5.props.URL_JSON_PARTICIPANT_ADVANCED_SEARCH = G5.props.URL_ROOT + 'tpl/participantAdvancedSearchPage.html'; //Advanced Search page url
G5.props.URL_JSON_PARTICIPANT_SEARCH_AUTOCOMPLETE = G5.props.URL_ROOT+'ajax/participantSearch_autocomp_firstName.json';//autocomplete data for participant search
G5.props.URL_JSON_PARTICIPANT_SEARCH_RESULTS = G5.props.URL_ROOT+'ajax/participantSearchResults.json';//participant search results

G5.props.URL_JSON_PUBLIC_RECOGNITION = G5.props.URL_ROOT+'ajax/publicRecognition_global.json';//pub rec items
G5.props.URL_JSON_PUBLIC_RECOGNITION_DETAIL = G5.props.URL_ROOT+'ajax/publicRecognitionDetail.json';//pub rec item
G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_COMMENT = G5.props.URL_ROOT+'ajax/publicRecognitionSaveComment.json';//save a comment - doesn't usually respond with anything
G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_LIKE = G5.props.URL_ROOT+'ajax/publicRecognitionSaveLike.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_UNLIKE = G5.props.URL_ROOT+'ajax/publicRecognitionSaveUnlike.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_SAVE_HIDE = G5.props.URL_ROOT+'ajax/publicRecognitionSaveHide.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_TRANSLATE = G5.props.URL_ROOT+'ajax/publicRecognitionTranslate.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_FOLLOW = G5.props.URL_ROOT+'ajax/publicRecognitionFollow.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_ADD_POINTS = G5.props.URL_ROOT+'ajax/publicRecognitionAddPoints.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_FOLLOWEES_ADD = G5.props.URL_ROOT+'ajax/publicRecognitionFollowees_add.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_FOLLOWEES_REMOVE = G5.props.URL_ROOT+'ajax/publicRecognitionFollowees_remove.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_FOLLOWEES_LIST = G5.props.URL_ROOT+'ajax/publicRecognitionFollowees_list.json';
G5.props.URL_JSON_PUBLIC_RECOGNITION_MINE = G5.props.URL_ROOT+'ajax/publicRecognition_mine.json';

//json for one or more participants
G5.props.URL_JSON_PARTICIPANT_INFO = G5.props.URL_ROOT+'ajax/participantInfo.json';
G5.props.URL_JSON_PARTICIPANT_FOLLOW = G5.props.URL_ROOT+'ajax/participantFollow.json';

// reports
// NOTE: these three URLs require PHP and for "AddType application/x-httpd-php ... .json" to be set to work
G5.props.URL_JSON_REPORTS_ALL = G5.props.URL_ROOT+'ajax/reportsReportMenu.json';
G5.props.URL_JSON_REPORTS_FAVORITES = G5.props.URL_ROOT+'ajax/reportsFavoriteReports.json';
G5.props.URL_JSON_REPORTS_MODULE = G5.props.URL_ROOT+'ajax/reportsDisplayDashboard.json';
// G5.props.URL_JSON_REPORTS_ALL = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/reportMenu.do';
// G5.props.URL_JSON_REPORTS_FAVORITES = G5.props.URL_ROOT+'ajax/reportsFavoriteCharts03.json';
// G5.props.URL_JSON_REPORTS_FAVORITES         = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/displayDashboard.do?method=display';
// G5.props.URL_JSON_REPORTS_FAVORITES_DELETE  = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/displayDashboard.do?method=remove';
// G5.props.URL_JSON_REPORTS_FAVORITES_ADD     = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/displayDashboard.do?method=save';
// G5.props.URL_JSON_REPORTS_FAVORITES_REORDER = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/displayDashboard.do?method=reOrder';
// G5.props.URL_JSON_REPORTS_MODULE = 'http://tsgbuild-dv.biperf.com:7001/bonfire/reports/displayDashboard.do?method=display';
G5.props.URL_REPORTS_ALL = 'layout.html?tpl=reportsPage&tplPath=apps/reports/tpl/';
// temporarily set this to smaller value for testing (eventually this will be 100)
G5.props.REPORTS_DETAIL_CUSTOM_RESULTS_PER_PAGE = 100;
G5.props.REPORTS_LARGE_AUDIENCE = false;

//rules page JSON
G5.props.URL_JSON_RULES = G5.props.URL_ROOT+'ajax/rulesPromotionCollection.json';

//send a recognition
G5.props.URL_JSON_SEND_RECOGNITION_GET_FORMSETUP = G5.props.URL_ROOT+'ajax/sendRecognitionGetFormSetup.json';
G5.props.URL_JSON_SEND_RECOGNITION_CHECK_PROMO_NODE = G5.props.URL_ROOT+'ajax/sendRecognitionPromoNodeCheck.json';
G5.props.URL_JSON_SEND_RECOGNITION_PRESELECTED_CONTRIBUTORS = G5.props.URL_ROOT+'ajax/sendRecognitionContributors_preselected.json';
G5.props.URL_JSON_SEND_RECOGNITION_CALCULATOR_INFO = G5.props.URL_ROOT+'ajax/sendRecognitionCalculatorInfo.json';

//ezRecognition
G5.props.URL_JSON_EZ_RECOGNITION_MEMBER_INFO = G5.props.URL_ROOT+'ajax/ezRecognitionMemberInfoColletion.json';
G5.props.URL_JSON_EZ_RECOGNITION_SEND_EZRECOGNITION = G5.props.URL_ROOT+'ajax/ezRecognitionSendEZRec.html';
G5.props.URL_JSON_EZ_RECOGNITION_RECIPIENT_LIST = G5.props.URL_ROOT+'ajax/ezRecognitionRecipientList.json';

G5.props.URL_JSON_TIPS = G5.props.URL_ROOT+'ajax/tipSetCollection.json';

//communication page JSON
G5.props.URL_JSON_COMMUNICATION_RESOURCE_CENTER_TABLE = G5.props.URL_ROOT+'ajax/communicationsManageResourceCenterTable.json';
G5.props.URL_JSON_COMMUNICATION_RESOURCE_CENTER_DATA = G5.props.URL_ROOT+'ajax/communicationsResourceCenterData.json';
G5.props.URL_JSON_COMMUNICATION_UPLOAD_DOCUMENT = G5.props.URL_ROOT+'ajax/communicationsUploadDoc.json';
G5.props.URL_JSON_COMMUNICATION_UPLOAD_IMAGE = G5.props.URL_ROOT+'ajax/communicationsUploadImage.json'; // delete me
G5.props.URL_JSON_COMMUNICATION_UPLOAD_IMAGES = G5.props.URL_ROOT+'ajax/communicationsUploadImages.json';
G5.props.URL_JSON_COMMUNICATION_SAVE_RESOURCE = G5.props.URL_ROOT+'ajax/communicationsSaveResource.json';
G5.props.URL_JSON_COMMUNICATION_TIPS_TABLE = G5.props.URL_ROOT+'ajax/communicationsManageTipsTable.json';
G5.props.URL_JSON_COMMUNICATION_BANNERS_TABLE = G5.props.URL_ROOT+'ajax/communicationsManageBannersTable.json';
G5.props.URL_JSON_COMMUNICATION_BANNER_DATA = G5.props.URL_ROOT+'ajax/communicationsBannersData.json';
G5.props.URL_JSON_COMMUNICATION_TIPS_DATA = G5.props.URL_ROOT+'ajax/communicationsTipsData.json';
G5.props.URL_JSON_COMMUNICATION_NEWS_TABLE = G5.props.URL_ROOT+'ajax/communicationsManageNewsTable.json';
G5.props.URL_JSON_COMMUNICATION_NEWS_DATA = G5.props.URL_ROOT+'ajax/communicationsNewsData.json';

//Select Audience Participants
G5.props.URL_JSON_SELECT_AUDIENCE_DATA = G5.props.URL_ROOT+'ajax/selectAudienceParticipantData.json';

//news page JSON
G5.props.URL_JSON_NEWS = G5.props.URL_ROOT+'ajax/news.json';

//profile page alerts tab JSON
G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_ALERTS = G5.props.URL_ROOT+'ajax/profilePageAlertsTabAlerts03.json';
G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGES = G5.props.URL_ROOT+'ajax/profilePageAlertsTabMessages02.json';
G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGE_DETAIL = G5.props.URL_ROOT+'assets/ajax/profilePageAlertsTabMessageDetail.json';
G5.props.PROFILE_ALERTS_MESSAGES_PER_PAGE = 10;
/*
G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGE_RESULTS = G5.props.URL_ROOT+'ajax/profilePageAlertsTabMessagesResults&resultsPerPage=16&pageNumber=1&sortedOn=0&sortedBy=desc';
G5.props.URL_JSON_PROFILE_PAGE_ALERTS_TAB_MESSAGE_RESULTS = G5.props.URL_ROOT+'ajax/profilePageAlertsTabMessagesResults&resultsPerPage=48&pageNumber=1&sortedOn=0&sortedBy=asc.json';
*/

//profile page personal information tab JSON
G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_IMAGE_UPLOAD = G5.props.URL_ROOT+'ajax/profilePagePersonalInformationTabImageUpload.do';
G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_IMAGE_UPLOAD_FAIL = G5.props.URL_ROOT+'ajax/profilePagePersonalInformationTabImageUploadFail.json';
G5.props.URL_JSON_PROFILE_PAGE_PERSONAL_INFORMATION_ABOUT_ME = G5.props.URL_ROOT+'ajax/profilePagePersonalInformationTabAboutMeResponse.json';

//profile page Statement tab JSON
G5.props.URL_JSON_PROFILE_PAGE_STATEMENT_TAB_SUMMARY = G5.props.URL_ROOT+'ajax/profilePageStatementTabSummary.json';

// Profile Page Security Tab
G5.props.URL_JSON_PROFILE_PAGE_SECURITY_TAB = G5.props.URL_ROOT + 'ajax/profilePageSecurityTab_success.json';//success
G5.props.URL_JSON_PROFILE_PAGE_PREFERENCES_TAB = G5.props.URL_ROOT + 'ajax/profilePagePreferencesTab_success.json';//success

// Profile Page Delegate/Proxies Page
G5.props.URL_JSON_PROFILE_PAGE_PROXIES = G5.props.URL_ROOT + 'ajax/profilePageProxiesTabProxies.json';

//quiz pages JSON
G5.props.URL_JSON_QUIZ_PAGE_ACTIVE_QUIZ = G5.props.URL_ROOT+'ajax/quizPageActiveQuiz.json';
G5.props.URL_JSON_QUIZ_PAGE_DETAILS = G5.props.URL_ROOT+'ajax/quizDetailsCollection.json';
G5.props.URL_JSON_QUIZ_PAGE_COURSE_MATERIALS = G5.props.URL_ROOT+'ajax/quizCourseMaterialsCollection.json';
G5.props.URL_JSON_QUIZ_PAGE_VIEW_RESULTS = G5.props.URL_ROOT+'ajax/quizViewResults.json';
G5.props.URL_JSON_QUIZ_PAGE_QUESTION_1 = G5.props.URL_ROOT+'ajax/quizQuestion1.json';
G5.props.URL_JSON_QUIZ_PAGE_QUESTION_2 = G5.props.URL_ROOT+'ajax/quizQuestion2.json';
G5.props.URL_JSON_QUIZ_PAGE_QUESTION_3 = G5.props.URL_ROOT+'ajax/quizQuestion3.json';
G5.props.URL_JSON_QUIZ_PAGE_QUESTION_4 = G5.props.URL_ROOT+'ajax/quizQuestion4.json';
G5.props.URL_JSON_QUIZ_PAGE_QUESTION_5 = G5.props.URL_ROOT+'ajax/quizQuestion5.json';
G5.props.URL_JSON_QUIZ_PAGE_ANSWER_1 = G5.props.URL_ROOT+'ajax/quizAnswer1.json';
G5.props.URL_JSON_QUIZ_PAGE_ANSWER_2 = G5.props.URL_ROOT+'ajax/quizAnswer2.json';
G5.props.URL_JSON_QUIZ_PAGE_ANSWER_3 = G5.props.URL_ROOT+'ajax/quizAnswer3.json';
G5.props.URL_JSON_QUIZ_PAGE_ANSWER_4 = G5.props.URL_ROOT+'ajax/quizAnswer4.json';
G5.props.URL_JSON_QUIZ_PAGE_ANSWER_5 = G5.props.URL_ROOT+'ajax/quizAnswer5.json';

G5.props.URL_JSON_QUIZ_PAGE_TAKE_QUIZ = G5.props.URL_ROOT+'ajax/quizPageTakeQuiz.json';
G5.props.URL_JSON_QUIZ_PAGE_TAKE_QUESTION = G5.props.URL_ROOT+'ajax/quizPageTakeQuestion.json';
G5.props.URL_JSON_QUIZ_PAGE_TAKE_ANSWER = G5.props.URL_ROOT+'ajax/quizPageTakeAnswer.json';

G5.props.URL_JSON_QUIZ_MATERIAL_UPLOAD = G5.props.URL_ROOT+'ajax/quizMaterialUpload.json';
G5.props.URL_JSON_QUIZ_EDIT_SAVE = G5.props.URL_ROOT+'ajax/quizEditSave.json';
G5.props.URL_JSON_QUIZ_TEAM_MEMBERS = G5.props.URL_ROOT+'ajax/quizTeamMembers.json';
G5.props.URL_JSON_QUIZ_CHECK_NAME = G5.props.URL_ROOT+'ajax/quizCheckName.json';


//draw tool JSON
G5.props.URL_JSON_DRAW_TOOL = G5.props.URL_ROOT+'ajax/drawToolInitialize.json';
G5.props.URL_JSON_DRAW_TOOL_IMAGE_UPLOAD = G5.props.URL_ROOT+'ajax/drawingToolImageUpload.json';

//destinations module JSON
G5.props.URL_JSON_DESTINATION_MODULE = G5.props.URL_ROOT+'ajax/destinationModule.json';
G5.props.URL_JSON_DESTINATION_PAGE = G5.props.URL_ROOT+'ajax/destinationPageCollection.json';

//purl Contribute JSON
G5.props.URL_JSON_PURL_ACTIVITY_FEED = G5.props.URL_ROOT+'ajax/purlActivityFeedCollection.json';
G5.props.URL_JSON_PURL_POST_COMMENT = G5.props.URL_ROOT+'ajax/purlContributeCommentPost.json';
G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS = G5.props.URL_ROOT+'ajax/purlContributeInvitesCollection.json';
G5.props.URL_JSON_PURL_UPLOAD_PHOTO = G5.props.URL_ROOT+'ajax/purlContributeCommentPhotoUpload.json';
G5.props.URL_JSON_PURL_INVITE_CONTRIBUTORS_EMAILED = G5.props.URL_ROOT+'ajax/purlEmailInviteInfoCollection.json';
G5.props.URL_JSON_PURL_UPLOAD_MODAL_PROFILE_PICTURE = G5.props.URL_ROOT+'ajax/purlModalMemberProfilePic.json';
G5.props.URL_JSON_PURL_POST_NEW_AWARD_DATE = G5.props.URL_ROOT+'ajax/purlAwardDateCollection.json';
G5.props.URL_JSON_PURL_SEND_THANK_YOU = G5.props.URL_ROOT+'ajax/purlSendThankYou.json';
G5.props.URL_JSON_PURL_TRANSLATE_COMMENT = G5.props.URL_ROOT+'ajax/purlTranslateComment.json';
G5.props.URL_JSON_PURL_CELEBRATE_DATA = G5.props.URL_ROOT+'ajax/purlCelebrateData.json';
G5.props.URL_JSON_PURL_CELEBRATE_SEARCH_RESULTS = G5.props.URL_ROOT+'ajax/participantSearchResults_purlRecognitions.json';
G5.props.URL_JSON_PURL_CELEBRATE_SEARCH_AUTOCOMPLETE = G5.props.URL_ROOT+'ajax/participantSearch_autocomp_firstName.json';//participant search results

//approvals
G5.props.URL_JSON_APPROVALS_LOAD_DATA = G5.props.URL_ROOT+'ajax/approvalsIndexCollection.json';
G5.props.URL_JSON_APPROVALS_LOAD_APPROVAL_MESSAGE_DATA = G5.props.URL_ROOT+'ajax/approvalsIndexCollection.json';
G5.props.URL_JSON_APPROVALS_LOAD_CLAIM_DETAIL_DATA = G5.props.URL_ROOT+'ajax/approvalsDetailClaimCollection.json';
G5.props.URL_JSON_APPROVALS_LOAD_CLAIMS = G5.props.URL_ROOT+'ajax/approvalsClaimsPromotion.json';
G5.props.URL_JSON_APPROVALS_TRANSLATE_COMMENT = G5.props.URL_ROOT+'ajax/approvalsTranslateComment.json';

//claims
G5.props.URL_JSON_CLAIM_ACTIVITY = G5.props.URL_ROOT+'ajax/claimsRecentActivity.json';

//firt time login
G5.props.URL_JSON_FIRST_TIME_LOGIN_PHOTO_UPLOAD = G5.props.URL_ROOT+'ajax/firstTimeLoginUploadPhoto.json';

//Self Enrollment first time login
G5.props.URL_JSON_SELFENROLLMENT_GENERATE_USERID = G5.props.URL_ROOT+'ajax/selfEnrollmentGeneratedUserId.json';
G5.props.URL_JSON_SELFENROLLMENT_CHECK_USERID = G5.props.URL_ROOT+'ajax/selfEnrollmentduplicateUserId.json';


//public profile
G5.props.URL_JSON_PUBLIC_PROFILE_LOAD_BADGES = G5.props.URL_ROOT+'ajax/publicProfileBadgeCollection.json';

//banner module
G5.props.URL_JSON_BANNER_SLIDES = G5.props.URL_ROOT+'ajax/bannerSlides.json';

//claim module
G5.props.URL_JSON_CLAIM_PROMOTIONS = G5.props.URL_ROOT+'ajax/claimPromotions.json';
G5.props.URL_CLAIM_VALIDATION = G5.props.URL_ROOT+'ajax/claimValidation.json';

//manager toolkit
G5.props.URL_JSON_MANAGER_LOCATIONS = G5.props.URL_ROOT+'ajax/statesOrLocationsForCountry.json';
G5.props.URL_JSON_MANAGER_ROSTEREDIT_GENERATE_USERID = G5.props.URL_ROOT+'ajax/RosterEditGeneratedUserId.json';
G5.props.URL_JSON_MANAGER_ROSTEREDITCHECK_USERID = G5.props.URL_ROOT+'ajax/rosterEditDuplicateUserId.json';

//goalquest
G5.props.URL_JSON_GOALQUEST_COLLECTION = G5.props.URL_ROOT+'ajax/goalQuestPromotionCollection.json?pt=gq';
G5.props.URL_JSON_CHALLENGEPOINT_COLLECTION = G5.props.URL_ROOT+'ajax/goalQuestPromotionCollection.json?pt=cp';
G5.props.URL_JSON_GOALQUEST_CHANGE_PLATEAU_AWARD = G5.props.URL_ROOT+'ajax/goalquestChangePlateauAward.json';


// engagement
G5.props.URL_JSON_ENGAGEMENT_SUMMARY_COLLECTION = G5.props.URL_ROOT+'ajax/engagementSummaryCollection.json';
G5.props.URL_JSON_ENGAGEMENT_MODEL = G5.props.URL_ROOT+'ajax/engagementModel.json';
G5.props.URL_JSON_ENGAGEMENT_TEAM_MEMBERS_COLLECTION = G5.props.URL_ROOT+'ajax/engagementTeamMembersCollection.json';
G5.props.URL_JSON_ENGAGEMENT_RECOGNIZED_COLLECTION = G5.props.URL_ROOT+'ajax/engagementRecognizedModel.json';

//forums
G5.props.URL_JSON_COMMENTS_MORE = G5.props.URL_ROOT+'ajax/forumDiscussionMore.json';
G5.props.URL_JSON_DISCUSSIONS = G5.props.URL_ROOT+'ajax/forumDiscussion.json';
G5.props.URL_JSON_DISCUSSIONS_MORE = G5.props.URL_ROOT+'ajax/forumDiscussionMore.json';
G5.props.URL_HTML_DISCUSSIONS = G5.props.URL_ROOT+'ajax/forumDiscussionsDisplayTableAjaxResponse.html';
G5.props.URL_HTML_TOPICS = G5.props.URL_ROOT+'ajax/forumTopicsDisplayTableAjaxResponse.html';
G5.props.URL_JSON_RECENT_DISCUSSIONS = G5.props.URL_ROOT+'ajax/forumRecentDiscussions.json';
G5.props.URL_JSON_FORUM_DISCUSSION_SAVE_LIKE = G5.props.URL_ROOT+'ajax/forumDiscussionSaveLike.json';
G5.props.URL_JSON_FORUM_COMMENT_SAVE_LIKE = G5.props.URL_ROOT+'ajax/forumCommentSaveLike.json';

//instant poll
G5.props.URL_JSON_INSTANT_POLL_COLLECTION = G5.props.URL_ROOT+'ajax/instantPollCollection.json';
G5.props.URL_JSON_INSTANT_POLL_SUBMIT_SURVEY = G5.props.URL_ROOT+'ajax/instantPollSubmit.json';


// spellchecker
G5.props.spellcheckerUrl = G5.props.URL_ROOT+'spellchecker/jazzySpellCheck.do';
// G5.props.spellcheckerUrl = G5.props.URL_ROOT+'ajax/spellchecker.php';
// G5.props.spellcheckerUrl = G5.props.URL_ROOT+'ajax/jazzySpellCheck.json';

// survey
G5.props.URL_JSON_SURVEY_PAGE_TAKE_SURVEY = G5.props.URL_ROOT+'ajax/surveyPageTakeSurvey.json';
G5.props.URL_JSON_SURVEY_PAGE_SAVE_SURVEY = G5.props.URL_ROOT+'ajax/surveyPageSaveSurvey.json';
G5.props.URL_JSON_SURVEY_PAGE_SUBMIT_SURVEY = G5.props.URL_ROOT+'ajax/surveyPageSubmitSurvey.json';

//throwdown
G5.props.URL_JSON_THROWDOWN_MATCHES = G5.props.URL_ROOT + 'ajax/throwdownMatch.json?promotionId=';
// G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MODEL = G5.props.URL_ROOT+'ajax/throwdownLeaderboardModel.json';//throwdown rankings
G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MODEL = G5.props.URL_ROOT+'ajax/throwdownLeaderboardModel.json?promotionId=';
G5.props.URL_JSON_THROWDOWN_LEADERBOARD_MORE = G5.props.URL_ROOT+'ajax/throwdownLeaderboardMore.json?promotionId=';

// G5.props.URL_JSON_THROWDOWN_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/throwdownLeaderboardSetCollection.json';//all leaderboards
G5.props.URL_JSON_THROWDOWN_LEADERBOARD_SETS = G5.props.URL_ROOT+'ajax/throwdownLeaderboardSetCollection.json?promotionId=';

G5.props.URL_JSON_THROWDOWN_PROMOTIONS = G5.props.URL_ROOT + 'ajax/throwdownPromotions.json';
G5.props.URL_JSON_TD_NEWS = G5.props.URL_ROOT+'ajax/throwdownNews.json'; //news
G5.props.URL_JSON_THROWDOWN_STANDINGS_LINK = G5.props.URL_ROOT+'ajax/throwdownStandings.json'; // the link to the standings page

// G5.props.URL_JSON_SMACK_TALK = G5.props.URL_ROOT+'ajax/smackTalk_global-DEV.json?promotionId='; // This version has PHP in the JSON for testing
G5.props.URL_JSON_SMACK_TALK = G5.props.URL_ROOT+'ajax/smackTalk_global.json?promotionId=';
G5.props.URL_JSON_SMACK_TALK_DETAIL = G5.props.URL_ROOT+'ajax/smackTalkDetail.json';//pub rec item
G5.props.URL_JSON_SMACK_TALK_SAVE_COMMENT = G5.props.URL_ROOT+'ajax/smackTalkSaveComment.json';//save a comment - doesn't usually respond with anything
G5.props.URL_JSON_SMACK_TALK_SAVE_LIKE = G5.props.URL_ROOT+'ajax/smackTalkSaveLike.json';
G5.props.URL_JSON_SMACK_TALK_SAVE_HIDE = G5.props.URL_ROOT+'ajax/smackTalkSaveHide.json';
G5.props.URL_JSON_SMACK_TALK_FOLLOW = G5.props.URL_ROOT+'ajax/smackTalkFollow.json';
G5.props.URL_JSON_SMACK_TALK_ADD_POINTS = G5.props.URL_ROOT+'ajax/smackTalkAddPoints.json';
G5.props.URL_JSON_SMACK_TALK_FOLLOWEES_ADD = G5.props.URL_ROOT+'ajax/smackTalkFollowees_add.json';
G5.props.URL_JSON_SMACK_TALK_FOLLOWEES_REMOVE = G5.props.URL_ROOT+'ajax/smackTalkFollowees_remove.json';
G5.props.URL_JSON_SMACK_TALK_FOLLOWEES_LIST = G5.props.URL_ROOT+'ajax/smackTalkFollowees_list.json';
G5.props.URL_JSON_SMACK_TALK_MINE = G5.props.URL_ROOT+'ajax/smackTalk_mine.json';
G5.props.URL_JSON_SMACK_TALK_NEW = G5.props.URL_ROOT+'ajax/smackTalk_new.json'; // URL for submitting new top level smack talk post


G5.props.URL_THROWDOWN_STANDINGS = G5.props.URL_ROOT+'ajax/throwdownStandingsTableDetail.json?promotionId=';
G5.props.URL_THROWDOWN_ALL_MATCHES = G5.props.URL_ROOT+'ajax/throwdownAllMatchesTableDetail_global.json?promotionId=';
// G5.props.URL_THROWDOWN_ALL_MATCHES = G5.props.URL_ROOT+'ajax/throwdownAllMatchesTableDetail_global-DEV.json?promotionId=';
G5.props.URL_THROWDOWN_ALL_MATCHES_TEAM = G5.props.URL_ROOT+'ajax/throwdownAllMatchesTableDetail_team.json?promotionId=';
// G5.props.URL_THROWDOWN_ALL_MATCHES_TEAM = G5.props.URL_ROOT+'ajax/throwdownAllMatchesTableDetail_team-DEV.json?promotionId=';


//Html to load in public profile throwdown player stats tab
G5.props.URL_HTML_THROWDOWN_PUBLIC_PROFILE = G5.props.URL_ROOT+'../apps/throwdown/tpl/throwdownPublicProfile.html';

//Celebration App
G5.props.URL_JSON_CELEBRATION_COUNTDOWN = G5.props.URL_ROOT+'ajax/celebrationChooseAwardCountdown.json';
G5.props.URL_JSON_CELEBRATION_RECOGNITION_PURL = G5.props.URL_ROOT+'ajax/celebrationRecognitionPurl.json';
G5.props.URL_JSON_CELEBRATION_IMAGE_FILLER_URL = G5.props.URL_ROOT+'ajax/celebrationImageFillerUrls.json';

// SSI
G5.props.URL_JSON_SSI_MASTER_PARTICIPANT = G5.props.URL_ROOT+'ajax/ssiModulesMasterParticipant.json';
G5.props.URL_JSON_SSI_MASTER_CREATOR = G5.props.URL_ROOT+'ajax/ssiModulesMasterCreator.json';
G5.props.URL_JSON_SSI_CONTEST = G5.props.URL_ROOT+'ajax/ssiSingleContest.json';
G5.props.URL_JSON_SSI_ARCHIVED_CONTEST = G5.props.URL_ROOT+'ajax/ssiArchivedContests.json';
G5.props.URL_JSON_SSI_AVAILABLE_CONTEST_TYPES = G5.props.URL_ROOT+'ajax/ssiAvailableCreatorContests.json';
G5.props.URL_JSON_CONTEST_CHECK_NAME = G5.props.URL_ROOT+'ajax/ssiContestCheckName.json';
G5.props.URL_JSON_SSI_DETAILS_OBJECTIVE_TABLE = G5.props.URL_ROOT+'ajax/ssiApproveContestObjectiveTable.json';
G5.props.URL_JSON_SSI_DETAILS_LEVELS_TABLE = G5.props.URL_ROOT+'ajax/ssiApproveContestLevelsTable.json';
G5.props.URL_JSON_SSI_DETAILS_RANKS_TABLE = G5.props.URL_ROOT+'ajax/ssiApproveContestRanksTable.json';
G5.props.URL_JSON_SSI_DETAILS_INVITEES_TABLE = G5.props.URL_ROOT+'ajax/ssiApproveContestInviteesTable.json';
G5.props.URL_JSON_SSI_ACTIVITY_HISTORY_TABLE = G5.props.URL_ROOT+'ajax/ssiActivityHistoryTable.json';
G5.props.URL_JSON_SSI_COPY_CONTEST = G5.props.URL_ROOT+'ajax/ssiCopyContestResponse.json';
G5.props.URL_JSON_SSI_DELETE_CONTEST = G5.props.URL_ROOT+'ajax/ssiDeleteContestResponse.json';
G5.props.URL_JSON_SSI_CONTEST_TAB_PREVIEW = G5.props.URL_ROOT+'ajax/ssiContestPreviewData.json';
G5.props.URL_JSON_SSI_ADMIN_CONTEST_DETAILS_TABLE = G5.props.URL_ROOT+'ajax/ssiAdminContestDetailsTable.json';
G5.props.URL_JSON_SSI_ACTIVE_CONTESTS = G5.props.URL_ROOT+'ajax/ssiActiveContests.json';
G5.props.URL_JSON_SSI_STACK_RANK_TABLE = G5.props.URL_ROOT+'ajax/ssiStackRankTable.json';
G5.props.URL_JSON_SSI_UPDATE_RESULTS_TABLE = G5.props.URL_ROOT+'ajax/ssiUpdateResultsData.json';
G5.props.URL_JSON_SSI_UPDATE_RESULTS_UPLOAD = G5.props.URL_ROOT+'ajax/ssiUpdateResultsUploadSS.json';
G5.props.URL_JSON_SSI_SUBMIT_CLAIM_FORM = G5.props.URL_ROOT+'ajax/ssiSubmitClaimData.json';
G5.props.URL_JSON_SSI_CLAIM_UPLOAD_DOCUMENT = G5.props.URL_ROOT+'ajax/ssiSubmitClaimUploadDoc.json';

//Work Happier
G5.props.URL_JSON_WORK_HAPPIER_PAST_RESULTS = G5.props.URL_ROOT+'ajax/workHappierPastResults.json';

// this retrieves URL parameters and stores them in G5.props.urlParams
G5.props.urlParams = {};
(function(){
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    while (match = search.exec(query)) { // this will throw a JSHint error, but it's just fine how it is
        G5.props.urlParams[decode(match[1])] = decode(match[2]);
    }
}());

// set some global datepicker options
$.fn.datepicker.defaults = {
    todayBtn : "linked", // true jumps to today but doesn't insert it. "linked" would insert today into the text input
    todayHighlight : true
};


// override the jHtmlArea plugin with improved dynamic localization
(function(){

    // if jHtmlArea has not been loaded, this override won't work
    if( !$.fn.htmlarea ) {
        $.fn.htmlarea = function() {};
        console.log('[ERROR] jHtmlArea has not been loaded');
        return false;
    }

    // Store a reference to the original remove method.
    var originalHtmlarea = $.fn.htmlarea;

    // Define overriding method.
    $.fn.htmlarea = function(){

        // clone arguments into an object that can be used inside the each loop
        var settings = arguments[0];

        return this.each(function() {
            // clone settings for this instance of the loop
            var options = settings,
            // figure out the localization string from the data attribute on the textarea element (default to base English if the data attribute is not present)
                localization = $(this).data('localization') || 'en';

            // extend the default toolbar text using the localization properties found in settings.i18n.js
            options.toolbarText = $.extend({}, jHtmlArea.defaultOptions.toolbarText, G5.props.richTextEditorLocalization[localization]);

            // always pass in a css url
            options.css = G5.props.URL_JHTML_STYLE;

            // if there is no content already in the textarea, insert <p>&nbsp;</p> to force paragraphs
            // if( $(this).val() === '' ) {
            //     $(this).val('<p>&nbsp;</p>');
            // }

            // execute the original method
            originalHtmlarea.apply( $(this), [options] );
        });
    };

})();


// set some global properties for rich text editors
G5.props.richTextEditor = {
    toolbar: [
        "bold", "italic", "underline",
        "|",
        "orderedList", "unorderedList",
        "|",
        // "indent", "outdent",

        // "|",

        // custom remove formatting button
        {
            css: 'removeFormat',
            text: 'Remove Formatting',
            action: function(btn) {
                // this.removeFormat();
                $(this.editor.body).html( $(this.editor.body).text() );
            }
        },

        // custom spellcheck button
        {
            css: "checkSpelling",
            text: "Check spelling",
            action: function(btn) { return; }
        }//,

        // "html"

    ],

    loaded: function (options) {
        // 'this' is equal to the jHtmlArea object
        var id = Math.round( Math.random()*10000 ),
            thisJHTML = this,
            charRem,
            $ct = $(this.container),
            $ta = $(this.textarea),
            $tb = $(this.toolbar),
            $ha = $(this.htmlarea),
            $fr = $(this.iframe),
            $ed = $(this.editor.body),
            $bw,
            updAndCaretEnd = function(mxLn){
                var s = thisJHTML.getSelection(),
                    r = document.createRange?document.createRange():false;

                thisJHTML.updateHtmlArea(); // update html area

                if(!r) {return;}

                r.selectNode($ed[0]);
                r.collapse(false);
                // s.removeAllRanges();
                // s.addRange(r);

                try {
                    s.removeAllRanges();
                    s.addRange(r);
                } catch (exception) {
                    // surpress potential IE9 errors
                }

            },
            placeholder = $ta.attr('placeholder'),
            placeholderHtml = '<p><span><i><span>'+placeholder+'</span></i></span></p>',
            handlePlaceholder,
            handleParagraphCleanup;

        // handle placeholders
        handlePlaceholder = function(e) {
            if( !placeholder ) {
                return false;
            }

            var showPlaceholder = function() {
                    $ta.val('');
                    $ed.html(placeholderHtml);
                    $fr.data('placeholderOn', true);
                },
                hidePlaceholder = function() {
                    $ta.val('<p></p>');
                    thisJHTML.updateHtmlArea();
                    $fr.data('placeholderOn', false);
                };

            switch(e.type) {
                case "click" :
                    if( $fr.data('placeholderOn') !== true ) {
                        return;
                    }
                    hidePlaceholder();
                    break;
                case "blur" :
                case "forced" :
                    // assume that if there is content in the textarea we shouldn't re-show the placeholder (note, compensating for the default "<p></p>" and for the placeholder string (converting to lower case for IE tag reasons)
                    if($ed.text().length && $ta.val().toLowerCase() != placeholderHtml.toLowerCase()) {
                        return;
                    }
                    showPlaceholder();
                    break;
            }

        };

        handleParagraphCleanup = function() {
            var str = $ed.html();

            str = str.match(/^(<p>|<p class)/gi) ? str : '<p>'+str;     // if the string doesn't start with a <p> tag, do so

            str = str.replace(/<\/div><div>|<(|\/)div>/gi,'<br>')                   // anywhere a div ends and restarts another one add a break tag, turn every remaining <div> tag into a <br> tag
                     .replace(/(<br>){3,}|<div><br>|<p><\/p><div>/gi,'</p><p>')     // turn fake full paragraph returns into proper ones
                     .replace(/<\/(o|u)l>/gi, '</$1l><p>')                          // anywhere a UL|OL is terminated, start a new <p>
                     .replace(/<p><(o|u)l>/gi, '<$1l>')                             // anywhere a UL|OL is wrapped in p tags, clean the start
                     .replace(/<(|\/)(div|br)><(o|u)l>/gi, '</p><$3l>')             // anywhere a UL|OL follows a </div>, make it follow a </p> instead
                     .replace(/(<p>){2,}/gi,'<p>')                                  // find any sequences of multiple <p> tags and replace with a single
                     .replace(/<div>|<\/div>|<p><\/p>|(<[A-z]+>)+$/gi,'');          // clean out left over <div> tags, empty paragraphs, and unmatched trailing open tags

            str = str.match(/<\/(p|ol|ul)>$/gi) ? str : str+'</p>';     // if the string doesn't end with a P|OL|UL, end with a </p>

            $ta.val(str);
            thisJHTML.updateHtmlArea();
        };

        // after the editor loads, do some initial clean it up
        handleParagraphCleanup();
        handlePlaceholder({type:'forced'});

        this._lastCharCount = $(this.textarea).val().length; // init with cur char count

        // give the frame a unique ID
        $fr.attr('id', 'frame' + id);

        // do the placeholder and paragraph cleanups when we work inside the editor or click anywhere outside it
        $ed.on('click keyup blur', function(e) {
            handlePlaceholder(e);
            if($ct.data('inFocus')) {
                return;
            }
            $ct.data('inFocus', true);
        });
        // $ed.on('mouseout', function() {
        //     handleParagraphCleanup();
        // });
        $ct.closest('.page').on('click', function(e) {
            if( $(e.target).closest($ct).length ) {
                return;
            }
            if( $ct.data('inFocus') === true ) {
                handleParagraphCleanup();
                handlePlaceholder({type:'forced'});
                $ct.data('inFocus', false);
            }
        });

        // clense! cheap-o cleanup of pasted text
        $ed.on('click keyup blur mouseout',function(){
            var tagsRe = /<\S[^><]*>/gi, // match all tags
                winRe = /<xml>[\s\S]*?<\/xml>|<style>[\s\S]*?<\/style>|class=".*?"|class=[a-z0-9]+|style=('|")[\s\S]*?\1|<!--[\s\S]*?-->/gi, // match msword garbage
                cycRe = /<(p|span)[^>]*?(>&nbsp;<|><)\/\1>/gi, // special regex
                curChCnt = $ta.val().length, // raw char count
                lstChCnt = thisJHTML._lastCharCount,
                cleanTxt = $ta.val(),
                maxCh = $ta.data('maxChars');

            thisJHTML._lastCharCount = curChCnt; // keep track of char count on obj

            // if the charcount diff is more than N chars (simple heuristic to check for paste)
            // this count must be greater than an increase from say, creating a list with bold text
            if(  curChCnt - lstChCnt > 40 ) {
                cleanTxt = cleanTxt.replace(winRe, ""); // windows stuff
                _.each(cleanTxt.match(tagsRe),function(tag){
                    if(!tag.match(/(<|<\/)(p|b|i|u|span|ul|ol|li|div)(\s|>)/i)) {// green list of tags
                        cleanTxt = cleanTxt.replace(tag,''); // remove other tags
                    }
                });
                cleanTxt = cleanTxt.replace(cycRe,"").replace(cycRe,""); // special, call twice

                $ta.val(cleanTxt); // set the value

                // this only needs to run on IE older than 11
                // note that as of IE11, $.browser will return 'mozilla', which means that 'msie' is equivalent to <= IE10. Sneaky suckers at MS
                if( $.browser.msie === true ) {
                    updAndCaretEnd(maxCh);
                }

            }

        });


        // MAX CHARS
        if( $ta.data('maxChars') ) {
            this._maxChars = parseInt($ta.data('maxChars'), 10);
            charRem = this._maxChars - $ed.text().length + (placeholder && $ed.text().match(placeholder) ? placeholder.length : 0);
            charRem = charRem > 0 ? charRem : 0;

            // add dom element
            $tb.append('<div class="charCount'+(charRem>50?'':' warning')+'">'
                + (options.toolbarText.charsRemaining||'rem chars') +' <b>'
                + charRem +'</b></div>' );

            // update char count
            $ed.on('click keyup blur',function(){
                var cr = thisJHTML._maxChars - $ed.text().length + (placeholder && $ed.text().match(placeholder) ? placeholder.length : 0);
                $tb.find('.charCount')[cr>50?'removeClass':'addClass']('warning');
                $tb.find('.charCount b').text(cr /*> 0 ? cr : 0*/);
                if(cr<0){
                    $tb.find('.charCount').stop(true,true,true).shake();
                }
            });

            // supress keypress if over limit
            // DISABLED -- this will disallow typing if text over the limit is pasted in
            // $(this.editor.body).on('keydown',function(e){
            //     var cr = thisJHTML._maxChars - $ed.html().length,
            //         k = e.keyCode;
            //     if(cr<=0) {
            //         if( _.contains([46,8,9,27,13], k) || (k==65 && e.ctrlKey===true) || (k>=35 && k<=39) ) {
            //             // Allow: backspace, delete, tab, escape, and enter || ctrl+a || home, end, left, right
            //         } else {
            //             // no keyup for you!
            //             e.preventDefault();
            //         }
            //     }
            // });

        }

        // check for the autogrow data attribute
        if( $ta.data('autogrow') === true ) {
            $fr.height( $ta.height() );

            $ed.addClass('richTextEditor').css('float', 'left');

            $tb.css({
                overflow : 'auto'
            });
            $ha.height( $ha.height() );

            $fr
                .css({
                    height : '100%'
                })
                .data('maxHeight', (parseInt( $ta.css('max-height'), 10) || 'none') )
                .data('minHeight', (parseInt( $ta.css('min-height'), 10) || $ta.height()) );

            $ed.on('click keyup blur', function() {
                var edht = $ed.height(),
                    frht = $fr.height();

                if( edht > frht && edht < $fr.data('maxHeight') || edht < frht && edht > $fr.data('minHeight') ) {
                    $ha.height( edht );
                }

                if( $fr.data('minHeight') < frht && frht < $fr.data('maxHeight') ) {
                    $fr.css({ overflow : 'visible' });
                }
                else {
                    $fr.css({ overflow : 'auto' });
                }
            });
        }

        // reformat the toolbar buttons to look like buttons and to use our icons
        $tb.find('ul').addClass('btn-group');
        $tb.find('li').not('.separator').addClass('btn');
        $tb.find('li.separator')
            .prev().addClass('sep-before')
            .end().next().addClass('sep-after');
        $tb.find('.bold').addClass('icon-bold');
        $tb.find('.italic').addClass('icon-italic');
        $tb.find('.underline').addClass('icon-underline');
        $tb.find('.orderedlist').addClass('icon-list-ol');
        $tb.find('.unorderedlist').addClass('icon-list-ul');
        $tb.find('.checkSpelling').addClass('icon-check');
        $tb.find('.removeFormat').addClass('icon-remove');
        $tb.find('.html').addClass('icon-wrench');

        // add the spellchecker menu
        if( !$tb.find('.langs').length ) {
            // turn the checkSpelling button into a Bootstrap dropdown toggle
            $tb.find('.checkSpelling')
                .addClass('dropdown-toggle').attr('data-toggle', 'dropdown')
                .parent().addClass('spellchecker dropdown');

            // start building our HTML string
            var langs = '<ul class="langs dropdown-menu"><li class="check">'+$tb.find('.checkSpelling').attr('title')+'</li>';

            // append each language listed in the spellCheckerLocalesToUse array
            $.each(G5.props.spellCheckerLocalesToUse, function(i,v) {
                if( G5.props.spellCheckerLocalization[v] ) {
                    langs += '<li class="lang '+v+'" data-lang="'+v+'">'+G5.props.spellCheckerLocalization[v].menu+'</li>';
                }
            });
            // close out the string
            langs += '</ul>';

            // append the menu to the "Check Spelling" toolbar button
            $tb.find('.spellchecker').append(langs);

            // add the target for the badwords box and store it in the jHTML object
            $ct.append('<div class="badwordsContainer"><div class="badwordsWrapper"><div class="badwordsContent" /></div></div>');
            this.badwords = $ct.find('.badwordsContainer')[0];
            $bw = $(this.badwords);

            // // create a qtip on the badwords container
            // $bw.qtip({
            //     position : {
            //         my : 'top center',
            //         at : 'bottom center',
            //         target : $ed
            //     }
            // });

            // bind click events to the list items we just added
            $tb.find('.langs .lang').on('click', function() {
                var lang = $(this).data('lang') || $ta.data('localization') || 'en',
                    localization = $.extend({}, G5.props.spellCheckerLocalization.en, G5.props.spellCheckerLocalization[ lang ]);

                // initiate the spellchecker
                $ed
                    .spellchecker({
                        url: G5.props.spellcheckerUrl,
                        lang: lang,
                        localization : localization,
                        engine: "jazzy",
                        suggestBoxPosition: "above",
                        innerDocument: false,
                        wordlist: {
                            action: "html",
                            element: $bw.find('.badwordsContent')
                        }
                    })
                // and call the spellchecker
                .spellchecker("check", {
                    callback : function(result){
                        console.log(lang, localization,result);
                        if(result===true) {
                            $bw.find('.spellcheck-badwords').remove();
                            alert(localization.noMisspellings);
                        }
                        else {
                            $bw.find('.spellcheck-badwords')
                                .prepend('<strong>'+localization.menu+':</strong>')
                                .append('<a class="close"><i class="icon-remove" /></a>');
                        }
                    },
                    localization : lang
                });
            });

            // add a click handler for the badwords box close
            $bw.on('click', '.close', function() {
                $bw.find('.spellcheck-badwords').remove();
            });

        }
    }
}; //G5.props.richTextEditor







// ****************************************************************
// jQuery
// ****************************************************************

// tiny additional jQuery utility for loading scripts dynamically
// the .getScript utility uses the cache busting approach by default and cannot be overridden
$.cachedScript = function( url, options ) {
    // Allow user to set any option except for dataType, cache, and url
    options = $.extend( options || {}, {
        dataType: "script",
        cache: true,
        url: url
    });

    // Use $.ajax() since it is more flexible than $.getScript
    // Return the jqXHR object so we can chain callbacks
    return $.ajax( options );
};

// Usage
/*
    $.cachedScript( "ajax/test.js" ).done(function( script, textStatus ) {
        console.log( textStatus );
    });
*/







// ****************************************************************
// Modernizr plugins
// ****************************************************************

// ## fileinput
// Detects whether input type="file" is available on the platform
// E.g. iOS < 6 and some android version don't support this

//  It's useful if you want to hide the upload feature of your app on devices that
//  don't support it (iphone, ipad, etc).

Modernizr.addTest('fileinput', function() {
    var elem = document.createElement('input');
    elem.type = 'file';
    return !elem.disabled;
});






// ****************************************************************
//  Handlebars helpers
// ****************************************************************

//commas to number
Handlebars.registerHelper('formatNumber',function(nStr){
    return $.format.number(nStr);
});

//if single helper
Handlebars.registerHelper('isSingle',function(arr,opts){
    if(arr && arr.length===1){
        return opts.fn({'single':arr[0]});
    }else{
        return opts.inverse(this);
    }
});

//pluck a property and output to json
Handlebars.registerHelper('pluck',function(arr,opts){
    if(arr && _.isArray(arr)){
        return JSON.stringify(_.pluck(arr,opts.hash.prop));
    }
});

//is JSON value equal to something
//from: https://gist.github.com/meddulla/2571518
//Usage in template
//{{#eq type "all" }}
//<button class="orderer" data-target="sortableAnswers_{{type}}">save order</button>
//{{else}}
//<span>foo</span>
//{{/eq}}
Handlebars.registerHelper('eq', function(val, val2, block) {
  if(val == val2){
    return block(this);
  } else {
    return block.inverse(this);
  }
});

//is JSON value unequal to something
//adapted from above
//Usage in template
//{{#ueq type "all" }}
//<button class="orderer" data-target="sortableAnswers_{{type}}">save order</button>
//{{else}}
//<span>foo</span>
//{{/ueq}}
Handlebars.registerHelper('ueq', function(val, val2, block) {
  if(val != val2){
    return block(this);
  } else {
    return block.inverse(this);
  }
});

//if both values are true
//adapated from: https://github.com/assemble/handlebars-helpers/blob/master/lib/helpers/helpers-comparisons.js
//Usage in template
// {{#and valueOne valueTwo}}
// <some code>
// {{else}}
// <some default code>
// {{/and}}
Handlebars.registerHelper('and', function(testA, testB, options) {
    if (testA && testB) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

//if either value is true
//adapated from: https://github.com/assemble/handlebars-helpers/blob/master/lib/helpers/helpers-comparisons.js
//Usage in template
// {{#or valueOne valueTwo}}
// <some code>
// {{else}}
// <some default code>
// {{/or}}
Handlebars.registerHelper('or', function(testA, testB, options) {
    if (testA || testB) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});


// debug helper
// usage: {{debug}} or {{debug someValue}}
// from: @commondream (http://thinkvitamin.com/code/handlebars-js-part-3-tips-and-tricks/)
Handlebars.registerHelper("debug", function(optionalValue) {
    console.log("Current Context");
    console.log("====================");
    console.log(this);
    if (optionalValue) {
        console.log("Value");
        console.log("====================");
        console.log(optionalValue);
    }
});
