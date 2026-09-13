"""Small Spark Structured Streaming example for the Tree11 Kafka topics."""
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json, to_timestamp, window
from pyspark.sql.types import DoubleType, LongType, StringType, StructType

KAFKA = "localhost:9092"
schema = StructType().add("captured_at", StringType()).add("entity_id", StringType()).add("route_id", StringType()).add("latitude", DoubleType()).add("longitude", DoubleType()).add("timestamp", LongType())

spark = SparkSession.builder.appName("tree11-mta-stream").getOrCreate()
events = spark.readStream.format("kafka").option("kafka.bootstrap.servers", KAFKA).option("subscribe", "tree11.mta.vehicle_positions").option("startingOffsets", "latest").load()
vehicles = events.select(from_json(col("value").cast("string"), schema).alias("event")).select("event.*").withColumn("event_time", to_timestamp("captured_at"))
counts = vehicles.withWatermark("event_time", "2 minutes").groupBy(window("event_time", "1 minute"), "route_id").count()
query = counts.writeStream.outputMode("update").format("console").option("truncate", "false").option("checkpointLocation", ".tmp/tree11-spark-checkpoint").start()
query.awaitTermination()
