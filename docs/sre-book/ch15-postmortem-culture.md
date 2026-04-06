# Chapter 15 — Postmortem Culture: Learning from Failure
*Google SRE Book — Written by John Lunney and Sue Lueder*

> The cost of failure is education.
> — Devin Carraway

## Google's Postmortem Philosophy

A postmortem is a written record of an incident, its impact, the actions taken to mitigate or resolve it, the root cause(s), and the follow-up actions to prevent recurrence.

The primary goals:
- Ensure the incident is documented
- All contributing root cause(s) are well understood
- Effective preventive actions are put in place to reduce likelihood and/or impact of recurrence

**Writing a postmortem is not punishment — it is a learning opportunity for the entire company.**

Common postmortem triggers:
- User-visible downtime or degradation beyond a certain threshold
- Data loss of any kind
- On-call engineer intervention (release rollback, rerouting of traffic, etc.)
- A resolution time above some threshold
- A monitoring failure (which usually implies manual incident discovery)

Define postmortem criteria before an incident occurs so that everyone knows when one is necessary. Any stakeholder may request a postmortem for an event.

## Blameless Postmortems

Blameless postmortems are a tenet of SRE culture. For a postmortem to be truly blameless, it must focus on identifying the contributing causes without indicting any individual or team for bad behavior. A blamelessly written postmortem assumes that everyone involved had good intentions and did the right thing with the information they had.

If a culture of finger pointing and shaming prevails, people will not bring issues to light for fear of punishment.

Blameless culture originated in the healthcare and avionics industries where mistakes can be fatal. These industries nurture an environment where every "mistake" is seen as an opportunity to strengthen the system. When postmortems shift from allocating blame to investigating the systematic reasons why an individual or team had incomplete or incorrect information, effective prevention plans can be put in place. You can't "fix" people, but you can fix systems and processes.

**Pointing fingers** (bad): "We need to rewrite the entire complicated backend system! It's been breaking weekly for the last three quarters and I'm sure we're all tired of fixing things onesy-twosy."

**Blameless** (good): "An action item to rewrite the entire backend system might actually prevent these annoying pages from continuing to happen, and the maintenance manual for this version is quite long and really difficult to be fully trained up on."

## Collaborate and Share Knowledge

The postmortem workflow includes collaboration and knowledge-sharing at every stage. Key features for collaboration:
- Real-time collaboration for rapid collection of data and ideas
- An open commenting/annotation system for crowdsourcing solutions
- Email notifications for looping in others

### Review Process

Formal review criteria:
- Was key incident data collected for posterity?
- Are the impact assessments complete?
- Was the root cause sufficiently deep?
- Is the action plan appropriate and are bug fixes at appropriate priority?
- Did we share the outcome with relevant stakeholders?

Once the initial review is complete, the postmortem is shared broadly — typically with the larger engineering team. The goal is to share postmortems to the widest possible audience that would benefit from the knowledge.

**Best practice: No Postmortem Left Unreviewed**: An unreviewed postmortem might as well never have existed. Regular review sessions close out ongoing discussions, capture ideas, and finalize state.

## Introducing a Postmortem Culture

Reinforcement activities at Google:

**Postmortem of the month**: A monthly newsletter shares an interesting and well-written postmortem with the entire organization.

**Postmortem reading clubs**: Teams host regular sessions where an interesting or impactful postmortem — often months or years old — is brought for open dialogue about what happened, what lessons it imparted, and its aftermath.

**Wheel of Misfortune**: New SREs are treated to an exercise where a previous postmortem is reenacted with engineers playing roles as laid out in the postmortem. The original incident commander attends to make the experience as "real" as possible.

### Making It Stick

- Ease postmortems into the workflow with a trial period
- Make writing effective postmortems a rewarded and celebrated practice, both publicly and through performance management
- Encourage senior leadership's acknowledgment and participation

**Visibly reward doing the right thing**: At a Google TGIF all-hands, an SRE discussed a release he'd pushed that, despite thorough testing, accidentally took down a critical service for four minutes. The incident only lasted four minutes because the SRE immediately rolled back the change. Not only did this engineer receive peer bonuses in recognition, he received a huge round of applause from thousands of Googlers including the company's founders. Recognition should come from peers, CEOs, and everyone in between.

## Conclusion

Thanks to continuous investment in postmortem culture, Google weathers fewer outages and fosters a better user experience. The universal goal across all products — YouTube, Gmail, Google Cloud, AdWords, Google Maps — is learning from our darkest hours. With a large number of postmortems produced each month, tools to aggregate them enable identifying common themes and areas for improvement across product boundaries.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
