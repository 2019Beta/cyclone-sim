# Eyewall replacement imagery

The rendering is a qualitative parametric simulation, not a calibrated SAR
retrieval or a numerical atmospheric model. No change to IR-BD shade thresholds.

Observational basis:

- [Sitkowski et al. (2011), Intensity and Structure Changes during Hurricane Eyewall Replacement Cycles](https://journals.ametsoc.org/view/journals/mwre/139/12/mwr-d-11-00034.1.xml): secondary wind maxima can precede a closed secondary convective ring; the inner maximum weakens and the outer maximum contracts.
- [NOAA: secondary eyewall formation](https://www.aoml.noaa.gov/hurricane_blog/paper-on-how-eyewall-replacement-cycles-start-published-in-the-journal-of-the-atmospheric-sciences/): formation can be asymmetric under vertical shear.
- [ESA SeaSAR 2018](https://seasar2018.esa.int/page_session25.php): high resolution SAR surface winds resolve secondary eyewall structure, unlike optical cloud-top imagery.

Implementation choices (illustrative, not fitted observational constants):
outer radius starts near 2.15 times the primary radius and contracts continuously;
the inner convective wall fades before the radius/weight handover completes.
Wall widths and moat width scale with wall separation. Base imagery has stronger
moat contrast than infrared, whose canopy remains present. Outer-eye clearing
is suppressed while the old wall is intact. The surface-wind model supplies two
radial maxima to SAR, keeping the existing steering vector and retrieval texture.
Cycle completion returns continuously to the existing primary-radius model;
persistent physical RMW growth and quantitative sensor calibration remain outside
this imagery change.

Validation: `node --test tests/*.test.cjs`. New tests check two wind maxima,
bounded wind speeds, radius contraction, completion continuity, and azimuthally
averaged double convective rings in the base and cloud-temperature fields.
