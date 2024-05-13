---
date: "2024-05-13T21:50:35Z"
title: "Network woes with my Raspberry Pi media server"
description: "OpenMediaVault vs. Tailscale. Whoever wins, I lose...my little remaining hair"
post_tags:
  - networking
  - linux
  - raspberrypi
  - tailscale
  - openmediavault
---

## For desperate and frustrated people

I've lost two seperate evenings to this so I might as well get a quick blog post out of it.

**If you don't need my life story, here's the tl;dr:**

- OpenMediaVault expects to be in sole control of the machine it runs on when installed on bare metal (i.e. not as a Docker container)
- It will pick up the `tailscale0` interface and attempt to create a Netplan config for it, but because that interface doesn't have a MAC address, the config file will be malformed and prevent all networking from starting up on next boot
- Delete or move `/etc/netplan/20-openmediavault-tailscale0.yaml` and reboot

## My setup

I'm running a Raspberry Pi 4 connected to a couple of USB hard drives as a quick-and-dirty home media server. I run OpenMediaVault because it has a nice web interface and I'm too lazy to set the Samba shares up myself, and it's on my Tailscale tailnet so I can stream stuff away from home. It works very nicely and was not a lot of cost or effort to set up.

## The problem

A few weeks ago we had a brief power cut and I lost my year+ uptime streak for the Pi, which had been running dutifully since the day I bought it. However, when power returned I could no longer access my media nor SSH in, either via Tailscale or directly over the LAN. It wasn't showing up as a connected device on my router either.

Fearing something had fried, I got it connected to a monitor (really glad I bought that micro-HDMI cable!) to find that it was completely fine, but that the `eth0` interface was down. Bringing it up manually didn't yield much; it wouldn't get an IP and my router just wasn't seeing it.

I can use Linux well enough, and set up and debug typical webserver stuff thanks to my day job, but when it comes to low-level OS and hardware config stuff, I'm very much out of my depth. After a few hours of fruitless Googling, I gave up and assumed that something on the SD card must have been corrupted by the power outage. That seemed unlikely, but SD corruption does seem to be fairly common with Pis and I didn't have much else to go on.

So I wiped the SD card, flashed a new OS image, set Tailscale and OMV up from scratch again, and all was well with the world.

Today I got a new drive to add to the pool, so I powered the Pi off (properly) so I could rejig what was plugged into which port. I turned it back on and...no network again. Connected it back up to a monitor and, once again, `eth0` was down and completely uncooperative.

## The solution

Driven by a suspicion now that this was not some random corruption and would keep happening, and that I _really_ couldn't be arsed to set everything up from scratch again, I set off on another aimless Google journey.

Among some sage advice to people with similar problems, I came across a suggestion to check the output from `journalctl`. This is probably incredibly obvious to people who know more stuff about Linux, but as they say: every day's a school day.

This gave me something—very helpfully rendered in bright red—that led to the solution: `netplan returned non-zero exit status 1`.

After some quick learning about what Netplan is and how I might find the exact issue, I found (with some excitement) that it was due to a malformed YAML file:

![An iMessage conversation of the moment I found the problem, with an error message from netplan apply](/img/network_problem_solved.jpeg)

It would appear that, either on installation or when changing some config, OpenMediaVault generates a set of Netplan configs for each network interface on the machine. It includes the MAC address, but because `tailscale0` isn't a physical device and doesn't _have_ a MAC address, the resulting file is invalid.

I moved this file elsewhere, rebooted, and everything worked perfectly again. I've tried connecting via Tailscale outside of my LAN and it seems to still work perfectly fine, so this file doesn't appear to be necessary at all.

I'm unsure if the file will come back as a result of some change or update, but at least I know how to fix it now. If it _does_ come back, I'll probably look at a Dockerised solution for OMV. It looks like OMV expects to be the only thing managing the machine, and not for someone to be fiddling around introducing new network interfaces. Amusingly, both of the times this has happened have been so delayed because I just never rebooted the Pi after setting up OMV. If I had, I'd have ran into the issue immediately and probably put the pieces together much quicker.

Anyway, I couldn't find any reports of this exact problem, so here's hoping this will be of help to someone out there, even if it's just me in the future.
