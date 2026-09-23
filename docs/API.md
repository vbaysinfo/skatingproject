# API & data reference

All requests go to the Apps Script Web App (via the website's `/api/gas` proxy):

```json
POST { "action": "getEvent", "payload": { "slug": "..." }, "token": "<session>", "key": "<API_PROXY_SECRET>", "clientIp": "..." }
```

Responses: `{ "success": true, "data": …, "message": "Success" }` or `{ "success": false, "error": "ERROR_CODE", "message": "User friendly message" }`.
Public read actions also accept `GET ?action=…&key=…&payload={json}` (cache-friendly). The role is always read from the `Users` sheet, never from the request.

## Actions

### Public (no login)

`getSettings`, `getHome`, `getAbout`, `getPage`, `getUpcomingEvents`, `getOngoingEvents`, `getPastEvents`, `getEvents`, `getEvent`, `getEventCategories`, `getEventResults`, `getPrograms`, `getProgram`, `getCertifications`, `getGallery`, `getVideos`, `getMembershipPlans`, `getAnnouncements`, `getSponsors`, `getRankings`, `submitContact`, `verifyMembership`, `verifyCertificate`, `setupStatus`, `register`, `login`, `adminLogin`, `googleLogin`

### Any signed-in user

`logout`, `me`, `completeProfile`, `changePassword`, `getNotifications`, `markNotificationRead`, `downloadDocument`

### Student (own data only)

`getStudentProfile`, `updateStudentProfile`, `getStudentDashboard`, `getStudentMembership`, `getStudentEvents`, `getStudentRegistrations`, `registerForEvent`, `cancelMyRegistration`, `getStudentResults`, `getStudentCertificates`, `getStudentAchievements`, `getStudentPayments`, `getMyDocuments`, `uploadMyDocument`, `applyMembership`, `registerForProgram`, `startPayment`, `verifyPayment`, `submitPaymentReference`

### System (website server only)

`paymentWebhook`, `runSetup`

### Admin (ADMIN role)

`admin.getAdminDashboard`, `admin.getStudents`, `admin.getStudent`, `admin.searchStudents`, `admin.createStudent`, `admin.updateStudent`, `admin.updateStudentStatus`, `admin.getEvents`, `admin.getEvent`, `admin.createEvent`, `admin.updateEvent`, `admin.publishEvent`, `admin.unpublishEvent`, `admin.cancelEvent`, `admin.archiveEvent`, `admin.generateCategories`, `admin.getEventReport`, `admin.getEventRegistrations`, `admin.exportEventRegistrations`, `admin.updateRegistration`, `admin.assignBibs`, `admin.createRegistration`, `admin.getMemberships`, `admin.createMembership`, `admin.approveMembership`, `admin.rejectMembership`, `admin.renewMembership`, `admin.setMembershipStatus`, `admin.getMembershipReport`, `admin.getResults`, `admin.saveResults`, `admin.createResult`, `admin.updateResult`, `admin.deleteResult`, `admin.publishResults`, `admin.createCertificate`, `admin.revokeCertificate`, `admin.publishCertificate`, `admin.regenerateCertificate`, `admin.generateEventCertificates`, `admin.getPayments`, `admin.updatePayment`, `admin.getReport`, `admin.export`, `admin.list`, `admin.get`, `admin.save`, `admin.setStatus`, `admin.delete`, `admin.bulkStatus`, `admin.upload`, `admin.getSettings`, `admin.updateSettings`, `admin.setSecret`, `admin.clearCache`, `admin.listAdmins`, `admin.createAdmin`, `admin.setAdminStatus`, `admin.deleteSampleData`, `admin.createSampleData`, `admin.getPrograms`, `admin.createProgram`, `admin.updateProgram`, `admin.publishProgram`, `admin.getGallery`, `admin.createGalleryItem`, `admin.updateGalleryItem`, `admin.deleteGalleryItem`, `admin.getMembershipPlans`, `admin.createMembershipPlan`, `admin.updateMembershipPlan`, `admin.getContactInquiries`, `admin.updateContactInquiry`, `admin.getSponsors`, `admin.updateSponsors`

Generic admin CRUD (`admin.list/get/save/setStatus/delete/bulkStatus`) accepts `entity`: programs, certifications, gallery, videos, announcements, sponsors, membershipPlans, rankingRules, achievements, eventCategories, inquiries, certificates, auditLogs, errorLogs.

## Sheets (database schema)

Columns after the specification's columns are platform extensions (consent, overrides, heats, etc.). Headers are created automatically by `setupSystem()`; columns are addressed by name, so their order may change.

- **Settings**: Setting_ID, Setting_Key, Setting_Value, Setting_Type, Description, Status, Updated_At
- **Users**: User_ID, Email, Role, Auth_Provider, Auth_Subject_ID, Student_ID, Status, Last_Login, Created_At, Updated_At, Display_Name, Password_Hash, Password_Salt, Password_Iterations
- **Sessions**: Session_ID, User_ID, Role, Expires_At, Status, Created_At, Last_Seen_At
- **Students**: Student_ID, User_ID, First_Name, Last_Name, Full_Name, DOB, Gender, Parent_Name, Parent_Mobile, Email, School, Class, Address, City, State, Pincode, Academy_ID, Experience_Level, Photo_URL, Drive_Folder_ID, Status, Created_At, Updated_At, Academy_Name, Emergency_Contact_Name, Emergency_Contact_Phone, Photo_File_ID, Terms_Accepted_At, Guardian_Consent_Name, Guardian_Consent_At, Admin_Notes
- **Student_Documents**: Document_ID, Student_ID, Document_Type, File_Name, Mime_Type, Drive_File_ID, Status, Uploaded_By, Created_At
- **Events**: Event_ID, Event_Code, Event_Name, Slug, Event_Type, Poster_URL, Poster_File_ID, Start_Date, End_Date, Registration_Start, Registration_Deadline, Venue, City, State, Description, Rules_URL, Entry_Fee, Maximum_Participants, Organizer, Contact, Drive_Folder_ID, Featured, Status, Created_At, Updated_At, Rules_File_ID, Rules_Text, Schedule, Registration_Override, Capacity_Override, Allow_Duplicate_Registration, Results_Published, Sponsor_IDs, Map_URL, Is_Sample
- **Event_Categories**: Category_ID, Event_ID, Category_Name, Age_Group, Gender, Race_Type, Distance, Entry_Fee, Maximum_Participants, Status, Created_At, Updated_At
- **Event_Registrations**: Registration_ID, Event_ID, Student_ID, Category_ID, Registration_Number, Bib_Number, Registration_Date, Payment_ID, Payment_Status, Registration_Status, Created_At, Updated_At, Heat, Lane, Amount, Terms_Accepted_At, Remarks
- **Membership_Plans**: Plan_ID, Plan_Name, Plan_Type, Description, Duration_Months, Fee, Benefits, Eligibility, Featured, Status, Created_At, Updated_At, Display_Order
- **Memberships**: Membership_ID, Student_ID, Plan_ID, Membership_Number, Start_Date, Expiry_Date, Payment_ID, Status, Card_URL, QR_Code, Approved_By, Approved_Date, Created_At, Updated_At, Remarks
- **Programs**: Program_ID, Program_Name, Program_Type, Slug, Short_Description, Full_Description, Image_URL, Duration, Eligibility, Fee, Certification, Location, Registration_Status, Featured, Display_Order, Status, Created_At, Updated_At, Image_File_ID, Schedule
- **Program_Registrations**: Program_Registration_ID, Program_ID, Student_ID, Registration_Date, Payment_ID, Status, Created_At, Updated_At
- **Certifications**: Certification_ID, Certification_Name, Certification_Type, Level, Eligibility, Duration, Assessment, Fee, Certificate_Type, Status, Created_At, Updated_At, Description, Display_Order
- **Student_Certifications**: Student_Certification_ID, Student_ID, Certification_ID, Issue_Date, Expiry_Date, Certificate_Number, Certificate_URL, Verification_Code, Status, Created_At, Event_ID, Certificate_Type, Position, Title, Certificate_File_ID, Result_ID, Updated_At
- **Results**: Result_ID, Event_ID, Category_ID, Student_ID, Bib_Number, Heat, Lane, Race_Time, Position, Points, Result_Status, Published, Created_At, Updated_At
- **Achievements**: Achievement_ID, Student_ID, Event_ID, Achievement_Type, Title, Description, Position, Date, Image_URL, Status, Created_At, Result_ID, Updated_At
- **Gallery**: Gallery_ID, Title, Category, Description, Image_URL, Drive_File_ID, Event_ID, Program_ID, Display_Order, Featured, Status, Created_At, Updated_At
- **Videos**: Video_ID, Title, Category, Description, Video_URL, Thumbnail_URL, Event_ID, Display_Order, Featured, Status, Created_At, Updated_At
- **Announcements**: Announcement_ID, Title, Description, Image_URL, Publish_Date, Expiry_Date, Priority, Display_Order, Status, Created_At, Link_URL, Updated_At
- **Sponsors**: Sponsor_ID, Sponsor_Name, Logo_URL, Website_URL, Description, Display_Order, Status, Created_At, Tier, Show_On_Home, Event_IDs, Updated_At
- **Contact_Inquiries**: Inquiry_ID, Name, Mobile, Email, Subject, Message, Date, Status, Admin_Notes, Created_At, Updated_At
- **Payments**: Payment_ID, User_ID, Student_ID, Event_ID, Membership_ID, Program_ID, Amount, Currency, Payment_Type, Gateway, Transaction_ID, Payment_Date, Payment_Status, Gateway_Response_ID, Remarks, Created_At, Updated_At, Gateway_Order_ID, Registration_ID, Program_Registration_ID
- **Notifications**: Notification_ID, User_ID, Title, Message, Type, Related_ID, Read_Status, Created_At, Dedupe_Key
- **Ranking_Settings**: Rule_ID, Position, Points, Category, Year, Status, Created_At, Updated_At
- **Drive_Folders**: Folder_ID, Folder_Type, Google_Drive_ID, Parent_Folder_ID, Folder_URL, Status, Created_At, Folder_Key
- **Audit_Logs**: Log_ID, User_ID, Role, Action, Entity_Type, Entity_ID, Old_Value, New_Value, Timestamp, IP_or_Context
- **Error_Logs**: Error_ID, Action, Code, Message, Stack, User_ID, Timestamp

## Relationships

Users.User_ID → Students.User_ID · Students.Student_ID → Event_Registrations / Memberships / Results / Student_Certifications / Achievements / Payments / Student_Documents ·
Events.Event_ID → Event_Categories / Event_Registrations / Results / Gallery / Payments · Event_Categories.Category_ID → Event_Registrations / Results ·
Membership_Plans.Plan_ID → Memberships · Programs.Program_ID → Program_Registrations · Payments.Payment_ID ↔ Event_Registrations / Memberships / Program_Registrations.

## IDs

`PREFIX-YYYY-000001`, generated under `LockService` with a per-prefix/year counter (re-seeded from the sheet if lost):
STU (student), EVT (event), REG (registration), MEM (membership number), MSP (membership application), CERT (certificate number),
PAY (payment), PRG (program), CAT (category), USR (user), RES (result), ACH, GAL, VID, ANN, SPN, INQ, PGR, PLN, CFN, SCR, DOC, RUL.

## Event lifecycle

`getEventLifecycleStatus(event)` → `CANCELLED` if Status = CANCELLED, else `UPCOMING` (today < Start_Date), `ONGOING`
(Start_Date ≤ today ≤ End_Date) or `PAST`. "Today" is computed in the `TIMEZONE` setting. It is never stored.

Registration state: `CANCELLED` · `CLOSED` (override CLOSED, past, or deadline passed) · `NOT_OPEN` (before Registration_Start) ·
`FULL` (count ≥ Maximum_Participants unless Capacity_Override) · `OPEN`. `Registration_Override = OPEN` ignores dates.
