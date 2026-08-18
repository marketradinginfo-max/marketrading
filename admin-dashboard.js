// ======================================================
// MARKETRADING - ADMIN DASHBOARD
// ======================================================
"use strict";

let currentAdmin = null;
let users = [];

const $ = id => document.getElementById(id);


// ======================================================
// HELPERS
// ======================================================

function formatMoney(value){

    return Number(value || 0).toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });

}


function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


function showMessage(text,type="success"){

    const box = $("messageBox");

    if(!box){
        console.log(text);
        return;
    }

    box.textContent = text;

    box.className =
        "message-box " + type;

    box.style.display = "block";

    clearTimeout(showMessage.timer);

    showMessage.timer =
        setTimeout(() => {

            box.style.display = "none";

        },6000);

}


function userName(id){

    const u =
        users.find(x => x.id === id);

    return u?.fullname ||
           u?.username ||
           u?.email ||
           id ||
           "Unknown user";

}


// ======================================================
// REQUIRE ADMIN
// ======================================================

async function requireAdmin(){

    const client =
        window.supabaseClient;

    if(!client){

        location.replace(
            "login.html"
        );

        return false;
    }


    const {data,error} =
        await client.auth.getSession();


    if(
        error ||
        !data?.session
    ){

        location.replace(
            "login.html"
        );

        return false;
    }


    const {
        data:profile,
        error:pe
    } =
        await client
        .from("profiles")
        .select(
            "id,fullname,username,email,avatar_url,role"
        )
        .eq(
            "id",
            data.session.user.id
        )
        .maybeSingle();


    if(pe){

        showMessage(
            "Cannot read your profile: " +
            pe.message,
            "error"
        );

        return false;
    }


    if(
        !profile ||
        String(profile.role || "").toLowerCase() !== "admin"
    ){

        location.replace(
            "dashboard.html"
        );

        return false;
    }


    currentAdmin =
        profile;


    if($("adminName")){

        $("adminName").textContent =
            profile.fullname ||
            profile.username ||
            profile.email ||
            "Administrator";

    }


    if(
        $("adminAvatar") &&
        profile.avatar_url
    ){

        $("adminAvatar").src =
            profile.avatar_url;

    }


    return true;
}


// ======================================================
// LOAD USERS
// ======================================================

async function loadUsers(){

    const client =
        window.supabaseClient;

    const tbody =
        $("usersTableBody");


    if(tbody){

        tbody.innerHTML =
            '<tr><td colspan="8">Loading users...</td></tr>';

    }


    const {
        data,
        error
    } =
        await client
        .from("profiles")
        .select("*")
        .order(
            "created_at",
            {ascending:false}
        );


    if(error){

        console.error(error);


        if(tbody){

            tbody.innerHTML =
                `<tr>
                    <td colspan="8">
                        Unable to load users.
                        <br>
                        <small>
                            ${escapeHtml(error.message)}
                        </small>
                    </td>
                </tr>`;

        }


        showMessage(
            "Supabase refused the users query: " +
            error.message,
            "error"
        );

        return false;
    }


    users =
        data || [];


    const nonAdmins =
        users.filter(
            u =>
                String(
                    u.role || ""
                ).toLowerCase() !== "admin"
        );


    // ==================================================
    // TOTAL USERS
    // ==================================================

    if($("totalUsers")){

        $("totalUsers").textContent =
            nonAdmins.length;

    }


    // ==================================================
    // TOTAL BALANCE
    // ==================================================

    if($("totalBalance")){

        $("totalBalance").textContent =
            formatMoney(
                nonAdmins.reduce(
                    (s,u) =>
                        s +
                        Number(
                            u.balance || 0
                        ),
                    0
                )
            );

    }


    // ==================================================
    // USER SELECT
    // ==================================================

    if($("userSelect")){

        $("userSelect").innerHTML =
            '<option value="">Select a user</option>';


        nonAdmins.forEach(u => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                u.id;


            option.textContent =
                `${
                    u.fullname ||
                    u.username ||
                    u.email ||
                    "Unnamed"
                } — ${
                    u.email || ""
                } — ${
                    formatMoney(
                        u.balance
                    )
                }`;


            $("userSelect")
                .appendChild(option);

        });

    }


    // ==================================================
    // USERS TABLE
    // ==================================================

    if(tbody){

        tbody.innerHTML = users.length

            ? users.map(u => {

                const isAdmin =
                    String(
                        u.role || ""
                    ).toLowerCase() === "admin";


                return `

                <tr>

                    <td>

                        <strong>

                            ${escapeHtml(
                                u.fullname ||
                                u.username ||
                                "Unnamed User"
                            )}

                        </strong>

                    </td>


                    <td>

                        ${escapeHtml(
                            u.email || "-"
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            u.country || "-"
                        )}

                    </td>


                    <td>

                        ${escapeHtml(
                            u.account_type ||
                            "Standard"
                        )}

                    </td>


                    <td>

                        <strong>

                            ${formatMoney(
                                u.balance
                            )}

                        </strong>

                    </td>


                    <td>

                        ${escapeHtml(
                            u.role || "user"
                        )}

                    </td>


                    <td>

                        ${
                            u.created_at

                            ? escapeHtml(
                                new Date(
                                    u.created_at
                                ).toLocaleString()
                            )

                            : "-"
                        }

                    </td>


                    <td>

                        ${
                            isAdmin

                            ? `
                                <span class="small-muted">
                                    Admin
                                </span>
                            `

                            : `
                                <button
                                    type="button"
                                    class="edit-balance-btn"
                                    onclick="editUserBalance('${u.id}')"
                                >
                                    <i class="fa-solid fa-pen-to-square"></i>
                                    Edit Balance
                                </button>
                            `
                        }

                    </td>

                </tr>

                `;

            }).join("")

            : `
                <tr>
                    <td colspan="8">
                        No users found.
                    </td>
                </tr>
            `;

    }


    return true;
}


// ======================================================
// EDIT USER BALANCE
// ======================================================

async function editUserBalance(userId){

    const user =
        users.find(
            u => u.id === userId
        );


    if(!user){

        return showMessage(
            "User was not found.",
            "error"
        );

    }


    // Never allow editing another admin
    if(
        String(
            user.role || ""
        ).toLowerCase() === "admin"
    ){

        return showMessage(
            "Admin balances cannot be edited here.",
            "error"
        );

    }


    const name =
        user.fullname ||
        user.username ||
        user.email ||
        "this user";


    const currentBalance =
        Number(
            user.balance || 0
        );


    const entered =
        prompt(
            `Current balance for ${name}: ${formatMoney(currentBalance)}\n\nEnter the new balance:`,
            currentBalance.toFixed(2)
        );


    if(entered === null){

        return;

    }


    const newBalance =
        Number(
            entered
        );


    if(
        !Number.isFinite(
            newBalance
        ) ||
        newBalance < 0
    ){

        return showMessage(
            "Enter a valid balance of zero or greater.",
            "error"
        );

    }


    if(
        newBalance === currentBalance
    ){

        return showMessage(
            "The new balance is the same as the current balance.",
            "error"
        );

    }


    const difference =
        newBalance -
        currentBalance;


    const actionText =
        difference > 0
        ? `increase by ${formatMoney(difference)}`
        : `decrease by ${formatMoney(Math.abs(difference))}`;


    if(
        !confirm(
            `Change ${name}'s balance from ${formatMoney(currentBalance)} to ${formatMoney(newBalance)}?\n\nThis will ${actionText}.`
        )
    ){

        return;

    }


    try{

        showMessage(
            "Updating balance...",
            "success"
        );


        const {
            data,
            error
        } =
            await window.supabaseClient
            .rpc(
                "admin_set_balance",
                {
                    p_user_id:
                        userId,

                    p_new_balance:
                        newBalance,

                    p_description:
                        "Admin balance adjustment"
                }
            );


        if(error){

            throw error;

        }


        console.log(
            "ADMIN SET BALANCE RESULT:",
            data
        );


        showMessage(
            `${name}'s balance is now ${formatMoney(newBalance)}.`,
            "success"
        );


        await Promise.all([

            loadUsers(),

            loadAdminCredits(),

            loadPendingAll()

        ]);


    }catch(error){

        console.error(
            "EDIT BALANCE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to edit user balance.",
            "error"
        );

    }

}


window.editUserBalance =
    editUserBalance;


// ======================================================
// LOAD ADMIN CREDITS
// ======================================================

async function loadAdminCredits(){

    const tbody =
        $("transactionsTableBody");


    if(!tbody){

        return;

    }


    const {
        data,
        error
    } =
        await window.supabaseClient
        .from("transactions")
        .select(
            "id,user_id,amount,balance_after,description,type,status,created_at"
        )
        .eq(
            "type",
            "admin_credit"
        )
        .order(
            "created_at",
            {ascending:false}
        )
        .limit(50);


    if(error){

        tbody.innerHTML =
            `<tr>
                <td colspan="5">
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>`;

        return;
    }


    const rows =
        data || [];


    if($("totalCredits")){

        $("totalCredits").textContent =
            formatMoney(
                rows.reduce(
                    (s,r) =>
                        s +
                        Number(
                            r.amount || 0
                        ),
                    0
                )
            );

    }


    tbody.innerHTML =
        rows.length

        ? rows.map(r => `

            <tr>

                <td>

                    ${escapeHtml(
                        userName(
                            r.user_id
                        )
                    )}

                </td>


                <td>

                    <strong>

                        ${formatMoney(
                            r.amount
                        )}

                    </strong>

                </td>


                <td>

                    ${formatMoney(
                        r.balance_after
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        r.description ||
                        "Admin credit"
                    )}

                </td>


                <td>

                    ${
                        r.created_at

                        ? escapeHtml(
                            new Date(
                                r.created_at
                            ).toLocaleString()
                        )

                        : "-"
                    }

                </td>

            </tr>

        `).join("")

        : `
            <tr>
                <td colspan="5">
                    No admin credits yet.
                </td>
            </tr>
        `;

}


// ======================================================
// ACTION BUTTONS
// ======================================================

function actionButtons(
    id,
    type
){

    return `

        <div class="admin-actions">

            <button
                class="approve-btn"
                onclick="processRequest(
                    '${id}',
                    '${type}',
                    'approve'
                )"
            >
                Approve
            </button>


            <button
                class="reject-btn"
                onclick="processRequest(
                    '${id}',
                    '${type}',
                    'reject'
                )"
            >
                Reject
            </button>

        </div>

    `;

}


// ======================================================
// LOAD PENDING REQUESTS
// ======================================================

async function loadPending(
    type,
    tbodyId
){

    const tbody =
        $(tbodyId);


    if(!tbody){

        return;

    }


    const {
        data,
        error
    } =
        await window.supabaseClient
        .from("transactions")
        .select(
            "id,user_id,amount,description,status,created_at"
        )
        .eq(
            "type",
            type
        )
        .eq(
            "status",
            "pending"
        )
        .order(
            "created_at",
            {ascending:false}
        )
        .limit(100);


    if(error){

        tbody.innerHTML =
            `<tr>
                <td colspan="6">
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>`;

        return;

    }


    const rows =
        data || [];


    if(!rows.length){

        tbody.innerHTML =
            '<tr><td colspan="6">No pending requests.</td></tr>';

        return;

    }


    tbody.innerHTML =
        rows.map(r => `

            <tr>

                <td>

                    ${escapeHtml(
                        userName(
                            r.user_id
                        )
                    )}

                    <div class="small-muted">

                        ${escapeHtml(
                            r.user_id
                        )}

                    </div>

                </td>


                <td>

                    <strong>

                        ${formatMoney(
                            r.amount
                        )}

                    </strong>

                </td>


                <td>

                    ${escapeHtml(
                        r.description ||
                        "-"
                    )}

                </td>


                <td>

                    ${
                        r.created_at

                        ? escapeHtml(
                            new Date(
                                r.created_at
                            ).toLocaleString()
                        )

                        : "-"
                    }

                </td>


                <td>

                    <span class="status-badge">

                        ${escapeHtml(
                            r.status
                        )}

                    </span>

                </td>


                <td>

                    ${actionButtons(
                        r.id,
                        type
                    )}

                </td>

            </tr>

        `).join("");

}


// ======================================================
// LOAD ALL PENDING REQUESTS
// ======================================================

async function loadPendingAll(){

    await Promise.all([

        loadPending(
            "deposit",
            "depositsTableBody"
        ),

        loadPending(
            "withdrawal",
            "withdrawalsTableBody"
        ),

        loadPending(
            "investment",
            "investmentsTableBody"
        )

    ]);

}


// ======================================================
// PROCESS REQUEST
// ======================================================

async function processRequest(
    transactionId,
    type,
    action
){

    const verb =
        action === "approve"
        ? "approve"
        : "reject";


    if(
        !confirm(
            `Are you sure you want to ${verb} this ${type} request?`
        )
    ){

        return;

    }


    try{

        const {
            error
        } =
            await window.supabaseClient
            .rpc(
                "admin_process_transaction",
                {
                    transaction_id:
                        transactionId,

                    decision:
                        action
                }
            );


        if(error){

            throw error;

        }


        showMessage(
            `${type} request ${action}d successfully.`,
            "success"
        );


        await Promise.all([

            loadUsers(),

            loadAdminCredits(),

            loadPendingAll()

        ]);

    }catch(e){

        console.error(
            "PROCESS REQUEST ERROR:",
            e
        );


        showMessage(
            e.message ||
            "Unable to process request.",
            "error"
        );

    }

}


window.processRequest =
    processRequest;


// ======================================================
// CREDIT VIRTUAL MONEY
// ======================================================

async function creditVirtualMoney(event){

    event.preventDefault();


    const userId =
        $("userSelect")?.value;


    const amount =
        Number(
            $("creditAmount")?.value
        );


    const description =
        $("creditDescription")?.value.trim() ||
        "Admin credit";


    if(!userId){

        return showMessage(
            "Please select a user.",
            "error"
        );

    }


    if(
        !Number.isFinite(amount) ||
        amount <= 0
    ){

        return showMessage(
            "Enter a valid amount greater than zero.",
            "error"
        );

    }


    const user =
        users.find(
            u => u.id === userId
        );


    if(!user){

        return showMessage(
            "Selected user was not found.",
            "error"
        );

    }


    const name =
        user.fullname ||
        user.username ||
        user.email ||
        "this user";


    if(
        !confirm(
            `Credit ${formatMoney(amount)} to ${name}?`
        )
    ){

        return;

    }


    const btn =
        $("creditBtn");


    if(btn){

        btn.disabled =
            true;

        btn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    }


    try{

        const {
            error
        } =
            await window.supabaseClient
            .rpc(
                "admin_credit",
                {
                    target_user_id:
                        userId,

                    credit_amount:
                        amount,

                    credit_description:
                        description
                }
            );


        if(error){

            throw error;

        }


        showMessage(
            `${formatMoney(amount)} credited to ${name}.`,
            "success"
        );


        $("creditForm")?.reset();


        await Promise.all([

            loadUsers(),

            loadAdminCredits()

        ]);

    }catch(e){

        console.error(e);


        showMessage(
            e.message ||
            "Credit failed.",
            "error"
        );

    }finally{

        if(btn){

            btn.disabled =
                false;

            btn.innerHTML =
                '<i class="fa-solid fa-plus"></i> Credit Balance';

        }

    }

}


// ======================================================
// LOGOUT
// ======================================================

async function logout(){

    try{

        await window.supabaseClient
            .auth
            .signOut();

    }finally{

        localStorage.removeItem(
            "user_id"
        );


        location.replace(
            "login.html"
        );

    }

}


// ======================================================
// MOBILE ADMIN MENU
// ======================================================

function setupMobileAdminMenu(){

    const sidebar =
        $("adminSidebar");

    const menuBtn =
        $("mobileMenuBtn");

    const closeBtn =
        $("mobileCloseBtn");

    const overlay =
        $("mobileOverlay");


    if(
        !sidebar ||
        !menuBtn ||
        !overlay
    ){

        return;

    }


    function openMenu(){

        sidebar.classList.add(
            "mobile-open"
        );


        overlay.classList.add(
            "show"
        );


        menuBtn.setAttribute(
            "aria-expanded",
            "true"
        );


        document.body.classList.add(
            "menu-open"
        );

    }


    function closeMenu(){

        sidebar.classList.remove(
            "mobile-open"
        );


        overlay.classList.remove(
            "show"
        );


        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );


        document.body.classList.remove(
            "menu-open"
        );

    }


    menuBtn.addEventListener(
        "click",
        openMenu
    );


    if(closeBtn){

        closeBtn.addEventListener(
            "click",
            closeMenu
        );

    }


    overlay.addEventListener(
        "click",
        closeMenu
    );


    sidebar
        .querySelectorAll(
            ".sidebar-menu li:not(#logoutBtn)"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    if(
                        window.innerWidth <= 768
                    ){

                        closeMenu();

                    }

                }
            );

        });


    window.addEventListener(
        "resize",
        () => {

            if(
                window.innerWidth > 768
            ){

                closeMenu();

            }

        }
    );

}


// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {


        // Credit form
        $("creditForm")?.addEventListener(
            "submit",
            creditVirtualMoney
        );


        // Refresh
        $("refreshUsersBtn")?.addEventListener(
            "click",
            async () => {

                await loadUsers();

                await loadAdminCredits();

                await loadPendingAll();

            }
        );


        // Logout
        $("logoutBtn")?.addEventListener(
            "click",
            logout
        );


        // Mobile menu
        setupMobileAdminMenu();


        // Admin authentication
        try{

            if(
                await requireAdmin()
            ){

                await loadUsers();

                await loadAdminCredits();

                await loadPendingAll();

            }

        }catch(e){

            console.error(e);


            showMessage(
                e.message ||
                "Admin dashboard failed.",
                "error"
            );

        }

    }
);