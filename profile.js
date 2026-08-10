// ==========================================
// MARKETRADING - PROFILE.JS
// ==========================================

// Wait until the page is fully loaded
document.addEventListener("DOMContentLoaded", () => {

loadProfile();

setupProfileForm();

setupAvatarUpload();

setupLogout();

});


// ==========================================
// LOAD USER PROFILE
// ==========================================

async function loadProfile() {

try {

// Check current login session
const {
data: { session },
error: sessionError
} = await supabaseClient.auth.getSession();

if (sessionError) {
console.error("Session error:", sessionError);
alert("Unable to check your login session.");
return;
}

// User is not logged in
if (!session) {
window.location.href = "login.html";
return;
}

const user = session.user;

// Get profile from Supabase
const {
data: profile,
error: profileError
} = await supabaseClient
.from("profiles")
.select("*")
.eq("id", user.id)
.maybeSingle();

if (profileError) {

console.error("Profile error:", profileError);

alert(
"Could not load your profile: " +
profileError.message
);

return;
}


// ==========================================
// GET PROFILE VALUES
// ==========================================

const fullname =
profile?.fullname ||
user.user_metadata?.fullname ||
"";

const username =
profile?.username ||
user.user_metadata?.username ||
"";

const phone =
profile?.phone ||
user.user_metadata?.phone ||
"";

const email =
profile?.email ||
user.email ||
"";


// ==========================================
// DISPLAY PROFILE INFORMATION
// ==========================================

const fullnameInput =
document.getElementById("fullname");

const usernameInput =
document.getElementById("username");

const emailInput =
document.getElementById("email");

const phoneInput =
document.getElementById("phone");


if (fullnameInput) {
fullnameInput.value = fullname;
}

if (usernameInput) {
usernameInput.value = username;
}

if (emailInput) {
emailInput.value = email;
}

if (phoneInput) {
phoneInput.value = phone;
}


// ==========================================
// DISPLAY USER NAME
// ==========================================

const topUserName =
document.getElementById("topUserName");

if (topUserName) {

topUserName.textContent =
fullname ||
username ||
"Investor";

}


// ==========================================
// DISPLAY AVATAR
// ==========================================

const profileImage =
document.getElementById("profileImage");

const topProfileImage =
document.getElementById("topProfileImage");


if (profile?.avatar_url) {

const avatarUrl =
profile.avatar_url +
(profile.avatar_url.includes("?") ? "&" : "?") +
"t=" +
Date.now();


if (profileImage) {
profileImage.src = avatarUrl;
}

if (topProfileImage) {
topProfileImage.src = avatarUrl;
}

}

} catch (error) {

console.error("Unexpected profile error:", error);

}

}


// ==========================================
// PROFILE FORM
// ==========================================

function setupProfileForm() {

const profileForm =
document.getElementById("profileForm");

if (!profileForm) {
return;
}


profileForm.addEventListener("submit", async (event) => {

event.preventDefault();


try {

// Check session
const {
data: { session }
} = await supabaseClient.auth.getSession();


if (!session) {

alert("Please login again.");

window.location.href = "login.html";

return;

}


const user = session.user;


// Get form values
const fullname =
document.getElementById("fullname")?.value.trim() || "";

const username =
document.getElementById("username")?.value.trim() || "";

const phone =
document.getElementById("phone")?.value.trim() || "";


// ==========================================
// UPDATE PROFILES TABLE
// ==========================================

const {
error: profileError
} = await supabaseClient
.from("profiles")
.update({
fullname: fullname,
username: username,
phone: phone
})
.eq("id", user.id);


if (profileError) {

console.error(profileError);

alert(
"Could not update profile: " +
profileError.message
);

return;

}


// ==========================================
// UPDATE SUPABASE AUTH METADATA
// ==========================================

const {
error: authError
} = await supabaseClient.auth.updateUser({

data: {
fullname: fullname,
username: username,
phone: phone
}

});


if (authError) {

console.warn(
"Auth metadata update failed:",
authError.message
);

}


// Update name at top immediately
const topUserName =
document.getElementById("topUserName");


if (topUserName) {

topUserName.textContent =
fullname ||
username ||
user.email ||
"Investor";

}


alert("Profile updated successfully!");

} catch (error) {

console.error(error);

alert(
"Something went wrong: " +
error.message
);

}

});

}


// ==========================================
// PROFILE PICTURE UPLOAD
// ==========================================

function setupAvatarUpload() {

const avatarInput =
document.getElementById("avatarInput");


if (!avatarInput) {

console.warn(
"avatarInput was not found."
);

return;

}


avatarInput.addEventListener("change", async (event) => {

const file =
event.target.files[0];


if (!file) {
return;
}


// ==========================================
// CHECK FILE TYPE
// ==========================================

if (!file.type.startsWith("image/")) {

alert(
"Please choose an image file."
);

avatarInput.value = "";

return;

}


// ==========================================
// CHECK FILE SIZE
// ==========================================

const maxSize =
5 * 1024 * 1024;


if (file.size > maxSize) {

alert(
"Your image must be smaller than 5MB."
);

avatarInput.value = "";

return;

}


try {

// ==========================================
// CHECK LOGIN
// ==========================================

const {
data: { session },
error: sessionError
} = await supabaseClient.auth.getSession();


if (sessionError || !session) {

alert(
"Your session has expired. Please login again."
);

window.location.href =
"login.html";

return;

}


const user = session.user;


// ==========================================
// CREATE UNIQUE FILE NAME
// ==========================================

const fileExtension =
file.name
.split(".")
.pop()
.toLowerCase();


const fileName =
Date.now() +
"." +
fileExtension;

const filePath = 
user.id + 
"/" + 
fileName;

// ==========================================
// UPLOAD TO SUPABASE STORAGE
// ==========================================

const {
error: uploadError
} = await supabaseClient
.storage
.from("avatars")
.upload(
filePath,
file,
{
cacheControl: "3600",
upsert: false
}
);


if (uploadError) {

console.error(
"Storage upload error:",
uploadError
);

alert(
"Image upload failed:\n\n" +
uploadError.message
);

avatarInput.value = "";

return;

}


// ==========================================
// GET PUBLIC IMAGE URL
// ==========================================

const {
data: publicUrlData
} = supabaseClient
.storage
.from("avatars")
.getPublicUrl(filePath);


if (!publicUrlData?.publicUrl) {

alert(
"The image uploaded, but its URL could not be created."
);

return;

}


const avatarUrl =
publicUrlData.publicUrl;


// ==========================================
// SAVE URL TO PROFILES TABLE
// ==========================================

const {
error: updateError
} = await supabaseClient
.from("profiles")
.update({
avatar_url: avatarUrl
})
.eq("id", user.id);


if (updateError) {

console.error(
"Database update error:",
updateError
);

alert(
"Image uploaded, but the profile could not be updated:\n\n" +
updateError.message
);

return;

}


// ==========================================
// SHOW NEW IMAGE IMMEDIATELY
// ==========================================

const profileImage =
document.getElementById("profileImage");


const topProfileImage =
document.getElementById("topProfileImage");


const freshUrl =
avatarUrl +
"?t=" +
Date.now();


if (profileImage) {

profileImage.src =
freshUrl;

}


if (topProfileImage) {

topProfileImage.src =
freshUrl;

}


alert(
"Profile picture updated successfully!"
);


// Clear file input
avatarInput.value = "";


} catch (error) {

console.error(
"Avatar upload error:",
error
);


alert(
"Something went wrong while uploading the picture:\n\n" +
error.message
);

}

});

}


// ==========================================
// LOGOUT
// ==========================================

function setupLogout() {

const logoutButton =
document.getElementById("logoutBtn");


if (!logoutButton) {
return;
}


logoutButton.addEventListener("click", async (event) => {

event.preventDefault();


try {

const {
error
} = await supabaseClient.auth.signOut();


if (error) {

alert(
"Logout failed: " +
error.message
);

return;

}


localStorage.removeItem("user_id");


window.location.href =
"login.html";


} catch (error) {

console.error(error);

alert(
"Logout error: " +
error.message
);

}

});

}
