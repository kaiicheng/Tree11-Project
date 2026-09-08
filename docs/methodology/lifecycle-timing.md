# Lifecycle timing

Request-to-inspection uses request `createddate` and the first linked inspection `inspectiondate` (falling back to its creation time). Request-to-work-order uses the first work-order creation time through direct inspection links. Negative and missing durations are counted and excluded; requests without a work order are right-censored rather than completed.
