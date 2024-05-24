---
date: "2024-05-24T22:10:27Z"
title: "Modern software has no respect for disk space"
post_tags:
  - mac
  - timemachine
  - apfs
  - software
---

I feel like it’s sorta common knowledge today, especially if you’re a developer, that most modern software does not give the slightest shit about gobbling up as much RAM and as many CPU cycles as it wants. Developer time is more expensive than hardware; especially if it’s someone else’s hardware you’re spending. It sucks, but it’s a known quantity at this point. What I _was_ somewhat surprised by recently is just how much of state things are in for disk hogging too.

My wife is considering upgrading her base M1 MacBook Air to something with a bit more oomph. It’s done an admirable job, but only having two USB ports is annoying if you don’t have a monitor with USB Power Delivery and/or ports of its own for peripherals, and 8GB RAM is becoming a bottleneck when she has lots of Chrome tabs and Office documents open. Ya know: completely normal, non-nerd stuff.

Apple’s pricing for storage is infamously price gouge-y, and we were looking at whether the extra £200 to jump from the 256GB storage she has now up to 512GB would be worth it, as her current machine only had about 20GB free.

I loaded up DaisyDisk (a fantastic and inexpensive little piece of software by the way, [highly worth a look](https://daisydiskapp.com)), and here’s some of the stuff I found:

- Google Chrome.app was 8GB. Upon further investigation, inside the main bundle is another bundle called Google Chrome.framework, and inside _that_ was approximately 15 previous versions of itself that, for whatever reason, never got cleaned up.
- She has three Chrome profiles; one for each of her two jobs and one for personal browsing. Each of those was between 1 and 3GB—I’m still not entirely sure _why_, as best I can tell it’s various caches.
- Microsoft Teams, despite somehow having a 1.2GB main app bundle, was storing a further 1.5GB of caches and other files.
- Backblaze internal files totalling 12GB. I actually already knew about this, as I’d ran across it before and discovered that [it’s by design](https://www.reddit.com/r/backblaze/comments/ay1d14/comment/eicz7fl/). Backblaze’s logs of processed files are append-only, and their recommended solution is to just…abandon your backup every few years and push everything completely from scratch. I generally find Backblaze to be a great product, but this always felt like a huge miss to me.
- Time Machine local snapshots were taking up around 40GB total. This is supposedly purgeable space that is freed up as it’s needed but…well, more on that below.

I then ran it on my own machine as, despite having a 512GB drive, I had much less storage free than I felt like I should given the relatively limited number of files I keep on the machine. I have a lot of developer tools which I know get pretty bloated, but even so:

- 10GB of old versions of JetBrains tools. I had the setting enabled in JetBrains Toolbox to keep the last version installed to allow for instant rollback, but that doesn’t explain why I had stuff dating back to 2022. Thankfully there is a UI inside the app itself to clear these out.
- 16GB of those fancy aerial wallpapers that were originally from the Apple TV. This one is sort of on me, given that I deliberately enabled the setting to cycle through them all. But, as far as I can see, there’s no way whatsoever to delete them from the same UI their downloads are triggered from (the Screen Saver area of System Settings). To remove them, I had to find them in `/Library/Application Support/com.apple.idleassetsd/Customer/4KSDR240FPS/` and delete the files. Real user friendly.
- rustup, which I had installed to briefly play around with Rust, had installed 1.5GB of HTML documentation.
- My NPM cache was 5GB. Actually I’m not surprised by this at all; the entire Node and NPM ecosystem is a fucking mess and I am more surprised every day that it has not exploded spectacularly since `left-pad`.
- Something like 35GB of old iOS Simulators for Xcode. I appreciate that a professional iOS developer might need to keep the sims around for every point release of iOS, but is it too much to ask for a prompt or a setting to automatically clean up the old versions when new ones are installed? At least you can delete these from a UI in Xcode itself.
- 60GB of local Time Machine snapshots

I can appreciate that in a world of multi-hundred-gigabyte to multi-terabyte disks, griping about a handful of single-digit GB caches seems silly. But when seemingly every large software vendor rolls with the “it’s free real estate” attitude, it can and does add up—to the point where an entry-level machine ends up largely full of stuff that, as far as a typical user is a concerned, is not their files.

When a computer runs out of RAM everything gets slow; when it runs out of disk, things _break_, in ways that [can be difficult to recover from](https://sixcolors.com/post/2024/03/a-disk-so-full-it-couldnt-be-restored/). Again, more on that below.

To quote my wife, “what was I supposed to do if I wasn’t married to a nerd?”—and she’s completely right! Dragging Chrome.app and Teams.app to the trash would have done nothing to clean up the even-larger-still caches sitting there in some obscure system directory.

## Addendum: Does anyone at Apple still work on Time Machine?

Time Machine under macOS Sonoma is just knackered.

If you use Time Machine, do a backup and let it finish. Then, close all your applications, quit any background applications you know are running, then just let your machine idle for an hour. Do another backup after that hour, and there’s a good chance Time Machine will claim to find tens of thousands of changes and then proceed to very slowly copy between several hundred MB and a few GB to your backup disk. Every. Single. Hour.

Ascertaining the real size of files on Macs, particularly APFS-formatted drives, [is](https://eclecticlight.co/2024/05/08/how-accurate-are-the-finders-folder-and-volume-sizes/) [notoriously](https://eclecticlight.co/2024/01/03/what-should-we-know-about-apfs-special-files/) [difficult](https://eclecticlight.co/2023/12/25/where-are-the-sanity-checks/), but I can see the free disk space on my backup drive ticking down—stuff is actually being written.

I know there’s system-level stuff going on in the background that will account for _some_ changes, even if you’re not actively using the computer. But there’s nothing beyond bugs that should account for that volume of data changing.

Next up: local snapshots. As I mentioned above, this is considered purgeable space by macOS, to be freed up when needed. Well, it doesn’t work very well.

Last month, I was downloading a ~150GB torrent. I intended to move it immediately off to a network drive after completion, Finder told me I had about 220GB free, and I was downloading to a folder excluded from Time Machine as I have no need for it to be part of my main backup. To me, this seemed totally fine.

Imagine my alarm then when I checked up on things after 30 mins to find that the download had stopped due to insufficient disk space. Random apps I had open were popping up scary warnings, and `df` was reporting 100% usage of my main Data volume (where user files are stored in modern macOS).

I suspected local snapshots were to blame, but `tmutil` commands were hanging, and I feared that if I tried to reboot the machine I wouldn’t be able to get back into it. I eventually found around a GB of build files I could regenerate, deleted them to free up some space, and was then able to run `tmutil listlocalsnapshots` and `tmutil deletelocalsnapshots` to clear out what was there, and whaddayaknow: everything immediately worked fine again.

APFS snapshots operate independently of Time Machine exclusions, so it’s no surprise that changes to a directory excluded from backup would still result in snapshots, but that does not change the fact that _this should not happen_. There should be no circumstance in which a file transfer that should leave 70GB of free disk space instead results in the system becoming so full that it’s borderline inoperable.

So now I’m in a bit of a dilemma. I’ve long worked under the “two is one, one is none” mantra for backups, with one on-site and one off-. But I trust Time Machine so little now that I’m not even sure it _would_ successfully recover my data if I needed it to. Maybe time to finally give Carbon Copy Cloner or SuperDuper a try.
