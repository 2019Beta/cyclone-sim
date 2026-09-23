# BAND14-BD reference adjustment

Visual reference: user-supplied `12E_BD_20260902165855.png`, GOES-18
BAND14-BD, 2026-09-02 16:58:55Z. This is a rendered image, not a
brightness-temperature dataset; the changes are visual approximations.

- Correct the OW ramp: approximately gray 109 at +9 C to 202 at -30 C.
  The previous ramp ran in the opposite direction.
- Extend the BD legend to +50 C while keeping temperatures above +25 C
  black. The modeled temperature field retains its existing upper bound.
- Preserve the discrete cold-cloud bands, including black at -63 to -69 C
  and white at -69 to -75 C. Retain the existing extreme-cold extensions;
  this reference's reported minimum of -79.409 C cannot validate them.
- Reduce the radial CDO blend from 50% to 38% of core roundness and retain
  bounded broad/cell displacement in mature cores, allowing connected,
  irregular temperature contours instead of overly concentric boundaries.
  Changes to cloud morphology affect both products through their shared
  temperature field. No random draws or extra noise samples are added.

Validation: palette endpoints and ramp direction; existing intensity ladder,
warm eye, replacement eyewall, temporal continuity, cloud morphology, and
hemisphere regression checks. These checks do not establish radiometric
calibration or pixel-for-pixel agreement with the reference storm.
