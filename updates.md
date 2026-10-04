Yes. Let's turn everything we've discussed into a **concrete update list** you can feed to your coding agent and start pushing.

The key is: **don't rebuild Workit from scratch. Update the existing system around this structure.**

# WORKIT — PRODUCT UPDATES TO BUILD NOW

## 1. MEMBER ONBOARDING / EXISTING GYM MEMBERSHIP

This is one of the biggest B2C updates.

When a new member joins Workit, give them two clear paths:

### A. "I'm looking for a gym"

They go into **Discover**.

They can:

* Search gyms
* Search by location
* Filter gyms
* View gym profile
* See photos
* Equipment
* Classes
* Coaches
* Reviews
* Pricing
* Distance
* Join/pay

### B. "I already belong to a gym"

They can search for their existing gym.

If the gym exists on Workit:

> **Join / Claim my membership**

They select the gym and submit their membership details.

Depending on how you want to verify it:

* membership number
* phone number
* name
* or gym admin approval

Then the gym becomes their **My Gym**.

### If their gym doesn't exist

Don't leave them stuck.

Give them:

> **Can't find your gym?**

Then:

**Request a gym**

They enter:

* Gym name
* Location
* Phone/social link if available
* Optional message

Workit stores the request.

This gives you a **free lead-generation system**.

If 30 people request:

> "XYZ Fitness"

you now know:

**There is demand for XYZ Fitness on Workit.**

That becomes a sales lead.

---

# 2. MY GYM

Once someone has a gym connected:

### My Gym becomes their home.

Show:

* Gym name
* Membership status
* Expiry date
* Check-in
* Recent activity
* Coaches
* Classes
* Gym community
* Gym buddies
* Membership/payment information

The experience should change depending on whether they actually have a connected gym.

---

# 3. CHECK-IN

Keep the simple system we discussed.

### Member opens Workit

**Check In**

→ Tap

→ Workit records the check-in

→ Gym receives notification.

Don't build QR scanning unless we later discover a real reason to.

### Later

You can add:

**"You're at [Gym]. Start session?"**

using location proximity.

But don't make GPS automatically check someone in.

---

# 4. WORKOUT / SESSION

Member can eventually:

### Start Session

→ Check in

→ Start workout

→ Log exercises

→ End session

Workit records:

* Workout
* Duration
* Exercises
* Sets/reps/weight
* History

This gives members a reason to use Workit **after they've already discovered/joined a gym.**

---

# 5. WORKIT TRAINERS

Keep the trainer ecosystem.

A trainer can register as:

> **Workit Trainer**

Then:

* Profile
* Photo
* Bio
* Phone/contact
* Specialties
* Location
* Gym affiliations
* Home service
* Rates
* Availability
* Reviews
* Verification status
* Bookings

### Two types

**Gym Coach**

Someone working under a particular gym.

**Workit Trainer**

Independent trainer available through Workit.

Eventually a trainer can offer:

* Gym sessions
* Home sessions
* Boxing
* Strength training
* Weight training
* etc.

Workit takes a commission from bookings.

---

# 6. TRAINER DISCOVERY

Don't create another giant discovery system.

Keep **one Discover experience**.

At the top:

### Discover

**Gyms | Trainers**

Users switch between them.

Gym discovery remains the default.

Trainer discovery shows:

* Trainer photo
* Name
* Rating
* Specialty
* Location
* Price
* Service type
* Available times

This keeps the app clean.

---

# 7. GYM COMMUNITY / GYM BUDDIES

This is the feature from your brother's idea that we decided **can have a place**, but shouldn't turn Workit into Instagram.

The principle:

> **Workit connects you with people you actually train with.**

Members can:

* Have a Workit username/handle
* Find gym members
* Add gym buddies
* See lightweight activity
* React to activity
* Encourage each other
* Eventually participate in challenges

No need for:

* DMs
* massive social feeds
* random public follower networks
* complicated social-media mechanics

Keep it fitness/gym-centric.

---

# 8. CHECK-IN LEADERBOARD

This is a good future engagement mechanic.

Example:

### This month's most active members

1. Member A — 18 check-ins
2. Member B — 16
3. Member C — 14

Eventually Workit could reward the winner with:

* Free protein bar
* Workit merchandise
* Gym reward
* Partner reward

**But don't build the reward economy yet.**

Build the check-in data first.

---

# 9. GYM STORE

This is the **new B2B feature** we discussed.

The gym admin gets:

### Store

They can add products:

> Water — ₦500 — 100 units

> Protein drink — ₦2,500 — 40 units

> Towel — ₦5,000 — 20 units

---

## Product import

Make manual entry easy.

But also allow:

### Import products

Prefer:

**CSV / Excel**

Example:

| Product       | Price | Quantity |
| ------------- | ----: | -------: |
| Water         |   500 |      100 |
| Protein Shake |  2500 |       40 |
| Towel         |  5000 |       20 |

Don't spend time building complicated Word/Notes parsing right now.

---

# 10. RECORDING A SALE

Make this **extremely fast** for reception.

### New Sale

**Search member**

↓

Select member

↓

**Add product**

↓

Select:

> Water × 1

↓

Choose:

**Paid**

or

**Add to balance**

↓

Done.

Workit automatically:

* deducts inventory
* records sale
* attaches it to member
* records payment status
* updates revenue

---

# 11. MEMBER STORE BALANCE

If the member takes something without paying:

> **Outstanding: ₦2,500**

When they pay:

> **Mark as paid**

The gym doesn't have to maintain a notebook.

---

# 12. STORE ANALYTICS

Gym admin can see:

* Current stock
* Products sold
* Revenue
* Outstanding purchases
* Sales today
* Sales this month
* Low-stock products

Again, this is about replacing:

> **paper + memory + manual calculations**

with Workit.

---

# 13. GENERAL MEMBER LEDGER

This is an important technical foundation.

Don't make the backend think only in terms of "store purchases."

Build:

**Member → Charge → Payment**

That allows Workit to eventually handle:

* Membership
* Store purchase
* Trainer
* Classes
* Late fees
* Other gym services

This will make future development much easier.

---

# 14. GYM ADMIN WEB APP

The web app remains the **serious management system**.

### Main areas

**Dashboard**

**Members**

**Memberships**

**Payments**

**Check-ins**

**Trainers/Coaches**

**Store**

**Analytics**

**Messages/Automation**

**Marketing**

**Settings**

Don't force all of that into the mobile admin experience.

Mobile admin should remain for quick/basic actions.

---

# 15. PRO FEATURES

Keep your current model.

### Free

Core gym operations.

### Pro — currently ₦25k/month hypothesis

Potential limits/features:

* Member limits
* Coach/staff limits
* Advanced analytics
* Automated renewal messages
* Bulk messaging
* Marketing campaigns
* Advanced reporting
* More automation
* Other advanced operational tools

**Don't aggressively gate analytics yet.**

You need gyms to experience the value first.

---

# 16. DISCOVERY DATABASE

This is another important system-level update.

You need a way for gyms to exist on Workit **even before the owner signs up.**

For example:

> Forge Fitness
> Port Harcourt
> Photos
> Location
> Basic information

Then a member can:

> **Claim this gym**

That gives you two things:

### Supply

Workit starts becoming a useful gym directory.

### Demand signal

You can see:

> 23 people have connected/requested this gym.

Now you approach the owner.

That's much stronger than cold-selling them a completely empty marketplace.

---

# 17. THE B2C CORE

This is what I want you to keep in your head while building.

Workit isn't simply:

> "Find a gym."

It's becoming:

> **The digital layer between a person and their gym life.**

### Discover

Find a gym.

### Join

Buy a membership **or connect an existing membership.**

### My Gym

Your gym lives inside Workit.

### Check In

Record your gym sessions.

### Train

Track workouts.

### Connect

Meet/connect with people you actually train with.

### Trainers

Find and book trainers.

### Pay

Memberships, trainers, classes and eventually other gym services.

---

# THE MOST IMPORTANT PART

You **do not need all of this finished before launch.**

Your immediate launch version should be:

### MEMBER

* Account
* Discover gyms
* Search
* Gym profile
* Existing gym / claim gym
* Request missing gym
* My Gym
* Membership
* Check-in
* Basic profile

### GYM

* Members
* Memberships
* Payments
* Check-ins
* Basic dashboard

### TRAINERS

* Basic profiles
* Discovery
* Booking groundwork

Then:

**Store → workout logging → community → leaderboards → automation → deeper marketplace features.**

Build the architecture so these can slot in, but **don't let the feature list become another reason you don't launch.**

Your actual target hasn't changed:

> **Get Workit into the hands of 3–5 real gyms and real members before the end of 2026.**

Everything else is there to make that product stronger—not to delay that milestone.
