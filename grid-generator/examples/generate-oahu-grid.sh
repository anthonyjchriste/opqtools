#!/bin/bash

LAT_START=21.791223
LON_START=-158.407745
LAT_END=21.247702
LON_END=-157.635269

SIZES=( 64 32 16 8 4 2 1 )

for s in "${SIZES[@]}"
do
    python ../grid-generator.py $LAT_START $LON_START $LAT_END $LON_END $s grid$s.json
    python ../grid-generator.py $LAT_START $LON_START $LAT_END $LON_END $s points$s.json -mp
done

