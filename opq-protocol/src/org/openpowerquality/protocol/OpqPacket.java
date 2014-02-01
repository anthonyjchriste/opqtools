/*
  This file is part of opq-tools.

  opq-tools is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  opq-tools is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with opq-tools. If not, see <http://www.gnu.org/licenses/>.

  Copyright 2014 Anthony Christe
*/

package org.openpowerquality.protocol;

import javax.xml.bind.DatatypeConverter;
import java.nio.ByteBuffer;
import java.util.Arrays;

/**
 * Provides a reference implementation of the OPQ communication protocol.
 * Protocol details can be found at https://github.com/openpowerquality/opq/wiki/OPQ-Communication-Protocol
 */
public class OpqPacket implements Comparable<OpqPacket> {
  /**
   * Used for header of packet.
   */
  public static final int MAGIC_WORD = 0x00C0FFEE;

  /**
   * Size of the packet without the payload.
   */
  public static final int PACKET_SIZE = 56;

  /**
   * Stores the start and stop indices for each portion of the this packet.
   */
  public enum Protocol {
    HEADER          (0, 3),
    TYPE            (4, 7),
    SEQUENCE_NUMBER (8, 11),
    DEVICE_ID       (12, 19),
    TIMESTAMP       (20, 27),
    BITFIELD        (28, 31),
    PAYLOAD_SIZE    (32, 35),
    RESERVED        (36, 51),
    CHECKSUM        (52, 55),
    PAYLOAD         (56, -1);

    private final int startByte;
    private final int stopByte;

    Protocol(int startByte, int endByte) {
      this.startByte = startByte;
      this.stopByte = endByte;
    }

    int getStartByte() {
      return this.startByte;
    }

    int getStopByte() {
      return this.stopByte;
    }
  }

  /**
   * Packet data.
   */
  private byte[] data;

  /**
   * Creates an empty packet.
   */
  public OpqPacket() {
    this.data = new byte[PACKET_SIZE];
    this.setHeader();
  }

  /**
   * Creates a packet from a string encoded in base 64.
   * @param encodedPacket String encoded in base 64.
   */
  public OpqPacket(String encodedPacket) {
    this.data = DatatypeConverter.parseBase64Binary(encodedPacket);
  }

  /**
   * Returns a specific part of the packet.
   * @param protocol Enum which determines which part of the data to return.
   * @return A copy of the subarray representing the pieces of data specified by the protocol.
   */
  public byte[] getDataPart(final Protocol protocol) {
    int stopByte = protocol.equals(Protocol.PAYLOAD) ? data.length : protocol.getStopByte() + 1;
    return Arrays.copyOfRange(data, protocol.getStartByte(), stopByte);
  }

  /**
   * Updates part of the packet based on which part of the packet is being modified.
   * @param protocol The enum specifying the part of the packet being modified.
   * @param data The data to update in the packet.
   */
  public void setDataPart(final Protocol protocol, byte[] data) {
    byte[] newData;

    // If we're changing the payload, we need to resize the array to hold the payload data.
    if(protocol.equals(Protocol.PAYLOAD)) {
      newData = new byte[PACKET_SIZE + data.length];
      System.arraycopy(this.data, 0, newData, 0, PACKET_SIZE);
      System.arraycopy(data, 0, newData, Protocol.PAYLOAD.getStartByte(), data.length);
      this.data = newData;
    }
    else {
      System.arraycopy(data, 0, this.data, protocol.getStartByte(), data.length);
    }
  }

  /**
   * Computes a checksum over the data by summing all fields minus the checksum.
   * @return The computed checksum.
   */
  public int computeChecksum() {
    int sum = 0;

    for(int i = 0; i < Protocol.CHECKSUM.getStartByte(); i++) {
      sum += data[i];
    }

    for(int i = Protocol.CHECKSUM.getStopByte() + 1; i < data.length; i++) {
      sum += data[i];
    }

    return sum;
  }

  /**
   * Return this packet as an encoded String in base 64.
   * @return Base 64 encoded String.
   */
  public String getBase64Encoding() {
    return DatatypeConverter.printBase64Binary(this.data);
  }

  /**
   * Returns a copy of the raw data of this packet.
   * @return A copy of the raw data of this packet.
   */
  public byte[] getData() {
    return this.data.clone();
  }

  /**
   * Returns the header.
   * @return The header.
   */
  public int getHeader() {
    return bytesToInt(this.getDataPart(Protocol.HEADER));
  }

  /**
   * Sets the header.
   *
   * Note that since the header should never change, this method simply sets the header
   * to whatever is stored as the MAGIC_WORD.
   */
  public void setHeader() {
    this.setDataPart(Protocol.HEADER, intToBytes(MAGIC_WORD));
  }

  /**
   * Returns the type of this packet.
   * @return The type of this paclet.
   */
  public int getType() {
    return bytesToInt(this.getDataPart(Protocol.TYPE));
  }

  /**
   * Sets the type of this packet.
   * @param type The type of this packet.
   */
  public void setType(int type) {
    this.setDataPart(Protocol.TYPE, intToBytes(type));
  }

  /**
   * Returns the sequence number of this packet.
   * @return The sequence number of this packet.
   */
  public int getSequenceNumber() {
    return bytesToInt(this.getDataPart(Protocol.SEQUENCE_NUMBER));
  }

  /**
   * Sets the sequence number of this packet.
   * @param sequenceNumber The squence number of this packet.
   */
  public void setSequenceNumber(int sequenceNumber) {
    this.setDataPart(Protocol.SEQUENCE_NUMBER, intToBytes(sequenceNumber));
  }

  /**
   * Returns the device id of this packet.
   * @return The device id of this packet.
   */
  public long getDeviceId() {
    return bytesToLong(this.getDataPart(Protocol.DEVICE_ID));
  }

  /**
   * Sets the device id of this packet.
   * @param deviceId The device id of this packet.
   */
  public void setDeviceId(long deviceId) {
    this.setDataPart(Protocol.DEVICE_ID, longToBytes(deviceId));
  }

  /**
   * Returns the timestamp of this packet.
   * @return The timestamp of this packet.
   */
  public long getTimestamp() {
    return bytesToLong(this.getDataPart(Protocol.TIMESTAMP));
  }

  /**
   * Sets the timestamp of this packet.
   * @param timestamp The timestamp of this packet.
   */
  public void setTimestamp(long timestamp) {
    this.setDataPart(Protocol.TIMESTAMP, longToBytes(timestamp));
  }

  /**
   * Returns the bitfield of this packet.
   * @return the bitfield of this packet.
   */
  public int getBitfield() {
    return bytesToInt(this.getDataPart(Protocol.BITFIELD));
  }

  /**
   * Sets the bitfield of this packet.
   * @param bitField The bitfield of this packet.
   */
  public void setBitfield(int bitField) {
    this.setDataPart(Protocol.BITFIELD, intToBytes(bitField));
  }

  /**
   * Returns the payload size of this packet.
   * @return The payload size of this packet.
   */
  public int getPayloadSize() {
    return bytesToInt(this.getDataPart(Protocol.PAYLOAD_SIZE));
  }

  /**
   * Sets the payload size of this packet.
   * @param payloadSize The payload size of this packet.
   */
  public void setPayloadSize(int payloadSize) {
    this.setDataPart(Protocol.PAYLOAD_SIZE, intToBytes(payloadSize));
  }

  /**
   * Returns the checksum of this packet.
   * @return The checksum of this packet.
   */
  public int getChecksum() {
    return bytesToInt(this.getDataPart(Protocol.CHECKSUM));
  }

  /**
   * Sets the checksum of this packet.
   *
   * Note that the checksum can't be set manually.
   * Instead, the computeChecksum method is called.
   */
  public void setChecksum() {
    this.setDataPart(Protocol.CHECKSUM, intToBytes(this.computeChecksum()));
  }

  /**
   * Returns the payload of this packet.
   * @return The payload of this packet.
   */
  public byte[] getPayload() {
    return this.getDataPart(Protocol.PAYLOAD);
  }

  /**
   * Sets the payload of this packet.
   * @param payload The payload of this packet.
   */
  public void setPayload(byte[] payload) {
    this.setPayloadSize(payload.length);
    this.setDataPart(Protocol.PAYLOAD, payload);
  }

  /**
   * Returns the voltage of this measurement.
   * @return The voltage of this measurement.
   */
  public double getVoltage() {
    byte[] payload = this.getPayload();
    byte[] voltage = Arrays.copyOfRange(payload, 8, payload.length);
    return ByteBuffer.wrap(voltage).getDouble();
  }

  /**
   * Returns the frequency of this measurement.
   * @return The frequency of this measurement.
   */
  public double getFrequency() {
    byte[] payload = this.getPayload();
    byte[] frequency = Arrays.copyOfRange(payload, 0, 8);
    return ByteBuffer.wrap(frequency).getDouble();
  }

  /**
   * Returns the value of this alert.
   * @return the value of this alert.
   */
  public double getAlertValue() {
    return ByteBuffer.wrap(this.getPayload()).getDouble();
  }

  /**
   * Sets the value of this alert.
   * @param value Value of this alert.
   */
  public void setAlertValue(double value) {
    this.setPayload(ByteBuffer.allocate(8).putDouble(value).array());
  }

  /**
   * Creates the byte sequence payload for setting the measurement.
   * @param frequency - The frequency of this measurement.
   * @param voltage - The voltage of this measurement.
   */
  public void setMeasurement(double frequency, double voltage) {
    byte[] frequencyData;
    byte[] voltageData;
    byte[] measurement = new byte[16];

    frequencyData = ByteBuffer.allocate(8).putDouble(frequency).array();
    voltageData = ByteBuffer.allocate(8).putDouble(voltage).array();
    System.arraycopy(frequencyData, 0, measurement, 0, frequencyData.length);
    System.arraycopy(voltageData, 0, measurement, 8, voltageData.length);
    this.setPayload(measurement);
  }

  /**
   * Convert an array of bytes into an integer.
   * @param b Array of bytes (must be of length 4).
   * @return An integer representing the array of bytes.
   */
  public static int bytesToInt(byte[] b) {
    assert(b.length == 4);
    return ByteBuffer.wrap(b).getInt();
  }

  /**
   * Converts an array of bytes into a long.
   * @param b Array of bytes (must be length 8)
   * @return A long representing the array of bytes.
   */
  public static long bytesToLong(byte[] b) {
    assert(b.length == 8);
    return ByteBuffer.wrap(b).getLong();
  }

  /**
   * Converts an integer into an array of bytes.
   * @param i The integer to convert.
   * @return The byte representation of the integer.
   */
  public static byte[] intToBytes(int i) {
    return ByteBuffer.allocate(4).putInt(i).array();
  }

  /**
   * Converts a long into an array of bytes.
   * @param i The long to convert.
   * @return The byte representation of the long.
   */
  public static byte[] longToBytes(long i) {
    return ByteBuffer.allocate(8).putLong(i).array();
  }

  /**
   * Compares two packets by their timestamps.
   * @param opqPacket The other OpqPacket.
   * @return The comparison between the two timestamps.
   */
  @Override
  public int compareTo(OpqPacket opqPacket) {
    return ((Long) this.getTimestamp()).compareTo(opqPacket.getTimestamp());
  }

  @Override
  public boolean equals(Object o) {
    if(this == o) {
      return true;
    }

    if(!(o instanceof OpqPacket)) {
      return false;
    }

    OpqPacket opqPacket = (OpqPacket) o;
    return Arrays.equals(this.data, opqPacket.getData());
  }

  @Override
  public int hashCode() {
    return Arrays.hashCode(this.data);
  }
}
